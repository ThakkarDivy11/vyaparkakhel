const { Server } = require('socket.io');
const { verifyToken } = require('@clerk/backend');
const { redis, acquireLock, releaseLock } = require('../redis/redisClient');
const { applyMove } = require('../../game/rules');
const { createInitialState } = require('../../game/state');
const { resetTurnTimer, cancelTurnTimer, startReconnectWindow, cancelReconnectWindow, initTimerWorkers } = require('../../game/timer');
const Game = require('../../models/game.model');
const Move = require('../../models/move.model');
const Snapshot = require('../../models/snapshot.model');
const { getOrCreateUserByProviderId } = require('../../utils/get_or_create_user');
const config = require('../../config/config');

// Pull the Clerk secret from config (which maps env-specific names like
// CLERK_TEST_SECRET_KEY) — process.env.CLERK_SECRET_KEY is not set in dev.
const env = process.env.NODE_ENV || 'development';
const clerkSecretKey = config[env]?.clerk?.secretKey || process.env.CLERK_SECRET_KEY || process.env.CLERK_TEST_SECRET_KEY;

const GAME_STATE_KEY = (gameId) => `game:${gameId}:state`;
const SNAPSHOT_INTERVAL = 20;

// ─── State helpers ────────────────────────────────────────────────────────────

async function loadGameState(gameId) {
  const raw = await redis.get(GAME_STATE_KEY(gameId));
  if (raw) return JSON.parse(raw);
  return recoverStateFromSnapshot(gameId);
}

// Redis miss recovery: reload from latest Snapshot + replay any Moves since.
// Only runs for games Mongo considers active — returns null for everything else.
async function recoverStateFromSnapshot(gameId) {
  try {
    const gameDoc = await Game.findOne({ gameId }, { status: 1 }).lean();
    if (!gameDoc || gameDoc.status !== 'active') return null;

    const snapshot = await Snapshot.findOne({ gameId }).sort({ lastSeq: -1 }).lean();
    if (!snapshot) {
      console.warn(`[recovery] no snapshot for ${gameId} — state unrecoverable`);
      return null;
    }

    const moves = await Move.find({ gameId, seq: { $gt: snapshot.lastSeq } })
      .sort({ seq: 1 })
      .lean();

    let state = snapshot.state;
    let replayed = 0;
    for (const move of moves) {
      try {
        state = applyMove(state, move.payload);
        replayed++;
      } catch (e) {
        console.error(`[recovery] move seq=${move.seq} failed: ${e.message} — stopping replay`);
        break;
      }
    }

    console.log(`[recovery] ${gameId}: restored from snapshot, replayed ${replayed}/${moves.length} moves`);
    await redis.set(GAME_STATE_KEY(gameId), JSON.stringify(state));
    return state;
  } catch (e) {
    console.error(`[recovery] ${gameId} failed:`, e.message);
    return null;
  }
}

async function saveGameState(gameId, state) {
  if (state && state.status === 'active') {
    const timePerTurn = (state.settings?.timePerTurnSec || 90) * 1000;
    state.turnDeadline = Date.now() + timePerTurn;
  }
  await redis.set(GAME_STATE_KEY(gameId), JSON.stringify(state));
}

async function getPlayerSeat(gameId, userId) {
  const game = await Game.findOne({ gameId }).lean();
  if (!game) return null;
  const player = game.players.find(p => p.userId.toString() === userId);
  return player ? player.seat : null;
}

// Resolves the current seat at action time (so a player who joins after
// the socket connects can still play). Returns the seat number or null.
async function resolveSeat(socket) {
  return getPlayerSeat(socket.data.gameId, socket.data.userId);
}

// ─── Socket init ──────────────────────────────────────────────────────────────

// Module-level reference so non-socket code (REST controllers, BullMQ workers)
// can broadcast events without re-creating the Server.
let _io = null;

// Public helper: broadcast an event to all sockets in a game's room.
// Returns true if io is initialized, false otherwise (caller can ignore).
function emitToGame(gameId, event, payload) {
  if (!_io) return false;
  _io.of('/games').to(gameId).emit(event, payload);
  return true;
}

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET', 'POST'] },
  });
  _io = io;

  initTimerWorkers(io);

  io.of('/games').use(async (socket, next) => {
    try {
      const { gameId } = socket.handshake.query;
      if (!gameId) return next(new Error('Missing gameId'));

      // Verify Clerk token
      const token = socket.handshake.auth?.token;
      if (!token) {
        console.error('[socket auth] No auth token provided');
        return next(new Error('No auth token'));
      }
      let userId;
      try {
        const payload = await verifyToken(token, { secretKey: clerkSecretKey });
        userId = payload.sub;
      } catch (err) {
        console.error('[socket auth] verifyToken failed! Secret key present:', !!clerkSecretKey, 'Error:', err.message);
        try {
          const fs = require('fs');
          const logPath = require('path').resolve(__dirname, '../../../socket_auth_debug.log');
          fs.appendFileSync(
            logPath,
            `[${new Date().toISOString()}] verifyToken failed!\n` +
            `Secret key present: ${!!clerkSecretKey}\n` +
            `Secret key length: ${clerkSecretKey ? clerkSecretKey.length : 0}\n` +
            `Secret key prefix: ${clerkSecretKey ? clerkSecretKey.substring(0, 7) : 'none'}\n` +
            `Error: ${err.message}\n` +
            `Stack: ${err.stack}\n` +
            `Token: ${token}\n\n`
          );
        } catch (logErr) {
          console.error('[socket auth] failed to write to log file:', logErr.message);
        }
        return next(new Error('Unauthorized'));
      }

      // Find or create the User on first authenticated socket. Uses the
      // shared helper so the socket and REST paths produce identical records
      // (real displayName fetched from Clerk, not a providerId hash).
      const user = await getOrCreateUserByProviderId(userId).catch((err) => {
        console.error('[socket auth] getOrCreateUser failed:', err.message);
        return null;
      });
      if (!user) return next(new Error('Could not create user'));

      // We don't snapshot seat here — handlers always re-resolve it via
      // resolveSeat(socket) so a player who joins after connecting can act.
      socket.data.gameId = gameId;
      socket.data.userId = user._id.toString();
      socket.data.providerId = userId;
      next();
    } catch (err) {
      next(new Error('Auth failed'));
    }
  });

  io.of('/games').on('connection', async (socket) => {
    const { gameId, userId } = socket.data;
    console.log(`[socket connect] gameId=${gameId} userId=${userId} socketId=${socket.id}`);

    if (gameId === 'matchmaking') {
      // Proactively clear player status in Redis when they enter the matchmaking lobby
      await redis.del(`player:status:${socket.data.providerId}`).catch(() => null);

      socket.on('find_match', async (_, ack) => {
        try {
          const { addToQueue, checkAndMatch } = require('../redis/matchmaking');
          await addToQueue(socket.data.providerId, socket.id);
          ack?.({ ok: true });
          
          // Trigger matchmaker check immediately
          setTimeout(() => checkAndMatch(io), 0);
        } catch (err) {
          ack?.({ ok: false, error: err.message });
        }
      });

      socket.on('simulate_match', async (_, ack) => {
        try {
          const { addToQueue, checkAndMatch } = require('../redis/matchmaking');
          const User = require('../../models/user.model');
          
          let mockUser = await User.findOne({ providerId: 'mock_competitor' });
          if (!mockUser) {
            mockUser = await User.create({
              username: 'mock_competitor',
              displayName: 'Mock Competitor',
              providerId: 'mock_competitor',
              email: 'mock@vyaparkakhel.com',
            });
          }
          
          await addToQueue(mockUser.providerId, 'dummy_socket_id');
          ack?.({ ok: true });
          
          setTimeout(() => checkAndMatch(io), 100);
        } catch (err) {
          ack?.({ ok: false, error: err.message });
        }
      });

      socket.on('cancel_match', async (_, ack) => {
        try {
          const { removeFromQueue } = require('../redis/matchmaking');
          await removeFromQueue(socket.data.providerId);
          ack?.({ ok: true });
        } catch (err) {
          ack?.({ ok: false, error: err.message });
        }
      });

      socket.on('disconnect', async () => {
        const { removeFromQueue } = require('../redis/matchmaking');
        await removeFromQueue(socket.data.providerId).catch(() => null);
      });

      return;
    }

    socket.join(gameId);

    // Push current game state to the connecting client (active games only)
    const state = await loadGameState(gameId);
    if (state) socket.emit('state_update', state);

    // For waiting games, broadcast a fresh lobby_update to the whole room
    // so already-connected players see the new joiner without needing them
    // to toggle ready first. Dedupe by userId before broadcasting in case
    // legacy data has duplicate player entries.
    const gameDoc = await Game.findOne({ gameId }).lean();
    if (gameDoc && gameDoc.status === 'waiting') {
      const isPassAndPlay = gameDoc.settings?.mode === 'pass_and_play';
      const isVsComputer = gameDoc.settings?.mode === 'vs_computer';
      const skipDedupe = isPassAndPlay || isVsComputer;
      const seen = new Set();
      const dedupedPlayers = gameDoc.players.filter(p => {
        const k = p.userId.toString();
        if (!skipDedupe && seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      io.of('/games').to(gameId).emit('lobby_update', { players: dedupedPlayers, settings: gameDoc.settings });
    }

    // Mark player connected + cancel reconnect window (re-resolve seat now)
    const initialSeat = await resolveSeat(socket);
    if (initialSeat !== null) {
      await cancelReconnectWindow(gameId, userId);
      await updateConnectionStatus(io, gameId, userId, initialSeat, true);
    }

    socket.on('player_ready', async (_, ack) => {
      console.log(`[player_ready] gameId=${gameId} userId=${userId}`);
      const seat = await resolveSeat(socket); // re-resolve in case of late join
      console.log(`[player_ready] resolved seat=${seat}`);
      if (seat === null) return ack?.({ ok: false, error: 'You are not a player in this game' });
      const lockKey = `lock:game:${gameId}`;
      const lockId = await acquireLock(lockKey, 3000);
      if (!lockId) return ack?.({ ok: false, error: 'game_busy' });
      try {
        const game = await Game.findOne({ gameId });
        if (!game || game.status !== 'waiting') {
          console.log(`[player_ready] invalid state: game=${!!game} status=${game?.status}`);
          return ack?.({ ok: false, error: 'invalid_state' });
        }
        const player = game.players.find(p => p.seat === seat);
        console.log(`[player_ready] found player=${!!player} wasReady=${player?.isReady}`);
        if (player) {
          player.isReady = !player.isReady;
          await game.save();
          console.log(`[player_ready] saved, nowReady=${player.isReady}`);
        }
        // Dedupe before broadcasting (defense in depth against legacy dups)
        const isPassAndPlay = game.settings?.mode === 'pass_and_play';
        const isVsComputer = game.settings?.mode === 'vs_computer';
        const skipDedupe = isPassAndPlay || isVsComputer;
        const seen = new Set();
        const dedupedPlayers = game.players.filter(p => {
          const k = p.userId.toString();
          if (!skipDedupe && seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        io.of('/games').to(gameId).emit('lobby_update', { players: dedupedPlayers, settings: game.settings });
        ack?.({ ok: true });
        console.log(`[player_ready] ack sent`);
      } catch (err) {
        console.error(`[player_ready] ERROR:`, err.message, err.stack);
        ack?.({ ok: false, error: err.message });
      } finally {
        await releaseLock(lockKey, lockId);
      }
    });

    socket.on('update_settings', async (settings, ack) => {
      console.log(`[update_settings] gameId=${gameId} userId=${userId}`);
      const lockKey = `lock:game:${gameId}`;
      const lockId = await acquireLock(lockKey, 3000);
      if (!lockId) return ack?.({ ok: false, error: 'game_busy' });
      try {
        const game = await Game.findOne({ gameId });
        if (!game || game.status !== 'waiting') {
          return ack?.({ ok: false, error: 'invalid_state' });
        }
        if (game.hostUserId.toString() !== userId) {
          return ack?.({ ok: false, error: 'forbidden' });
        }

        // Merge settings
        if (settings && typeof settings === 'object') {
          if (settings.boardTheme !== undefined) {
            game.settings.boardTheme = settings.boardTheme;
          }
          if (settings.maxPlayers !== undefined) {
            game.settings.maxPlayers = settings.maxPlayers;
          }
          if (settings.timePerTurnSec !== undefined) {
            game.settings.timePerTurnSec = settings.timePerTurnSec;
          }
          if (settings.allowTrading !== undefined) {
            game.settings.allowTrading = settings.allowTrading;
          }
          if (settings.freeParkingMoney !== undefined) {
            game.settings.freeParkingMoney = settings.freeParkingMoney;
          }
        }

        await game.save();

        const isPassAndPlay = game.settings?.mode === 'pass_and_play';
        const isVsComputer = game.settings?.mode === 'vs_computer';
        const skipDedupe = isPassAndPlay || isVsComputer;
        const seen = new Set();
        const dedupedPlayers = game.players.filter(p => {
          const k = p.userId.toString();
          if (!skipDedupe && seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        io.of('/games').to(gameId).emit('lobby_update', {
          players: dedupedPlayers,
          settings: game.settings
        });
        ack?.({ ok: true });
      } catch (err) {
        console.error(`[update_settings] ERROR:`, err.message);
        ack?.({ ok: false, error: err.message });
      } finally {
        await releaseLock(lockKey, lockId);
      }
    });

    socket.on('game_action', async (rawAction, ack) => {
      let seat = await resolveSeat(socket);
      if (seat === null) return ack?.({ ok: false, error: 'You are not a player in this game' });

      // Support pass_and_play mode where the host can act for any seat
      const gameDoc = await Game.findOne({ gameId }).lean();
      if (gameDoc && gameDoc.settings?.mode === 'pass_and_play') {
        if (gameDoc.hostUserId.toString() === userId && rawAction.seat !== undefined) {
          seat = rawAction.seat;
        }
      }

      const action = { ...rawAction, seat };

      // Server generates dice for ROLL_DICE
      if (action.type === 'ROLL_DICE') {
        action.dice = [
          Math.ceil(Math.random() * 6),
          Math.ceil(Math.random() * 6),
        ];
      }

      // LEAVE_GAME requires special handling: waiting-room games have no
      // Redis state, so we can't route through processGameAction directly.
      if (action.type === 'LEAVE_GAME') {
        try {
          await processLeaveGame(io, gameId, userId, seat);
          ack?.({ ok: true });
        } catch (err) {
          ack?.({ ok: false, error: err.message });
        }
        return;
      }

      try {
        await processGameAction(io, gameId, action);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', async () => {
      const seat = await resolveSeat(socket);
      if (seat === null) return;
      await updateConnectionStatus(io, gameId, userId, seat, false);
      await startReconnectWindow(gameId, userId);
    });
  });

  return io;
}

// ─── Shared action processor (used by socket + timer workers) ─────────────────

async function processGameAction(io, gameId, action) {
  const lockKey = `lock:game:${gameId}`;
  const lockId = await acquireLock(lockKey, 5000);
  if (!lockId) throw new Error('game_busy');

  try {
    let state = await loadGameState(gameId);
    if (!state) throw new Error('game_state_not_found');

    const newState = applyMove(state, action);
    await saveGameState(gameId, newState);

    // Append move log (best-effort, non-blocking)
    await Move.create({
      gameId,
      seq: Date.now(), // timestamp as monotonic seq
      type: action.type,
      payload: action,
      playerUserId: null,
    }).catch(() => null);

    // Snapshot every SNAPSHOT_INTERVAL moves
    const moveCount = await Move.countDocuments({ gameId });
    if (moveCount % SNAPSHOT_INTERVAL === 0) {
      await Snapshot.create({ gameId, state: newState, lastSeq: moveCount }).catch(() => null);
    }

    // Broadcast to all in room
    io.of('/games').to(gameId).emit('state_update', newState);

    // Reset turn timer for next player (90s default)
    const timePerTurn = (newState.settings?.timePerTurnSec || 90) * 1000;
    if (newState.status === 'active') {
      await resetTurnTimer(gameId, newState.currentTurnSeat, timePerTurn);
    } else {
      await cancelTurnTimer(gameId);
      if (newState.status === 'finished') {
        await Game.findOneAndUpdate({ gameId }, { status: 'finished', endedAt: new Date() });
        io.of('/games').to(gameId).emit('game_over', {
          winnerSeat: newState.players.find(p => !p.isBankrupt)?.seat,
        });
          for (const p of newState.players) {
            if (p.providerId) {
              await redis.del(`player:status:${p.providerId}`).catch(() => null);
            }
          }
      }
    }

    // Trigger bot turn if next player is a bot
    triggerBotPlay(gameId, newState);
  } finally {
    await releaseLock(lockKey, lockId);
  }
}

// Handles LEAVE_GAME for both waiting and active games.
// Waiting: manipulates Mongo directly (no Redis state yet).
//   - Host leaves → room_cancelled broadcast; all clients route home.
//   - Non-host leaves → remove from players[], lobby_update broadcast.
// Active: treated as bankruptcy via applyMove + standard broadcast pipeline.
async function processLeaveGame(io, gameId, userId, seat) {
  const lockKey = `lock:game:${gameId}`;
  const lockId = await acquireLock(lockKey, 3000);
  if (!lockId) throw new Error('game_busy');
  try {
    const gameDoc = await Game.findOne({ gameId });
    if (!gameDoc) return;

    // Cancel any pending reconnect window so the bot-replacement worker
    // doesn't fire for a player who intentionally left.
    await cancelReconnectWindow(gameId, userId).catch(() => null);

    if (gameDoc.status === 'waiting') {
      if (seat === 0) {
        // Host leaving → dissolve the room
        gameDoc.status = 'cancelled';
        await gameDoc.save();
        io.of('/games').to(gameId).emit('room_cancelled', { reason: 'host_left' });
      } else {
        // Non-host leaving → remove player slot
        gameDoc.players = gameDoc.players.filter(p => p.seat !== seat);
        await gameDoc.save();
        const seen = new Set();
        const dedupedPlayers = gameDoc.players.filter(p => {
          const k = p.userId.toString();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        io.of('/games').to(gameId).emit('lobby_update', { players: dedupedPlayers, settings: gameDoc.settings });
      }
      return;
    }

    if (gameDoc.status === 'active') {
      // Apply LEAVE_GAME action inline (we already hold the lock so we can't
      // call processGameAction which would try to acquire the same lock).
      const state = await loadGameState(gameId);
      if (!state) return;
      const newState = applyMove(state, { type: 'LEAVE_GAME', seat });
      await saveGameState(gameId, newState);
      io.of('/games').to(gameId).emit('state_update', newState);

      const leavingPlayer = state.players.find(p => p.seat === seat);
      if (leavingPlayer && leavingPlayer.providerId) {
        await redis.del(`player:status:${leavingPlayer.providerId}`).catch(() => null);
      }

      if (newState.status === 'finished') {
        await cancelTurnTimer(gameId);
        await Game.findOneAndUpdate({ gameId }, { status: 'finished', endedAt: new Date() });
        io.of('/games').to(gameId).emit('game_over', {
          winnerSeat: newState.players.find(p => !p.isBankrupt)?.seat,
        });
        for (const p of newState.players) {
          if (p.providerId) {
            await redis.del(`player:status:${p.providerId}`).catch(() => null);
          }
        }
      } else {
        const timePerTurn = (newState.settings?.timePerTurnSec || 90) * 1000;
        await resetTurnTimer(gameId, newState.currentTurnSeat, timePerTurn);
      }
    }
  } finally {
    await releaseLock(lockKey, lockId);
  }
}

async function markPlayerAsBot(io, gameId, userId) {
  const lockKey = `lock:game:${gameId}`;
  const lockId = await acquireLock(lockKey, 3000);
  if (!lockId) return;
  try {
    const state = await loadGameState(gameId);
    if (!state) return;
    // Match by userId (Mongo ObjectId string) or providerId (Clerk id)
    const player = state.players.find(
      p => p.userId === userId || p.providerId === userId
    );
    if (player && !player.isBot) {
      player.isBot = true;
      await saveGameState(gameId, state);
      io.of('/games').to(gameId).emit('state_update', state);
      io.of('/games').to(gameId).emit('player_disconnected', {
        seat: player.seat,
        displayName: player.displayName,
        isBot: true,
      });
      console.log(`[markPlayerAsBot] seat=${player.seat} converted to bot`);
    }
  } finally {
    await releaseLock(lockKey, lockId);
  }
}

async function updateConnectionStatus(io, gameId, userId, seat, connected) {
  const state = await loadGameState(gameId);
  if (!state) return;
  const player = state.players.find(p => p.seat === seat);
  if (!player) return;
  player.isConnected = connected;
  player.disconnectedAt = connected ? null : new Date().toISOString();

  // Un-bot on reconnect. The 5-min reconnect window converts disconnected
  // players to bots so the game keeps moving; if the human comes back
  // (with a valid JWT and a real socket), give them control again.
  let unbotted = false;
  if (connected && player.isBot) {
    player.isBot = false;
    unbotted = true;
  }

  await saveGameState(gameId, state);

  if (unbotted) {
    // Persist the un-bot in Mongo too so a future state rehydration is correct
    await Game.findOneAndUpdate(
      { gameId, 'players.seat': seat },
      { $set: { 'players.$.isBot': false } }
    ).catch(() => null);
    // Push fresh state so all clients update isBot in their UI
    io.of('/games').to(gameId).emit('state_update', state);
  }

  io.of('/games').to(gameId).emit(
    connected ? 'player_connected' : 'player_disconnected',
    { seat, displayName: player.displayName }
  );
}

async function triggerBotPlay(gameId, state) {
  if (!_io) return;

  if (state.phase === 'auction' && state.auction) {
    // Find all active bots that have not passed yet
    const activeBots = state.players.filter(
      p => p.isBot && !p.isBankrupt && !state.auction.passedSeats.includes(p.seat)
    );

    activeBots.forEach(bot => {
      // Add a randomized delay so they don't bid at the exact same instant
      setTimeout(async () => {
        try {
          const currentState = await loadGameState(gameId);
          if (!currentState || currentState.phase !== 'auction' || !currentState.auction || currentState.status !== 'active') {
            return;
          }
          // Make sure the bot hasn't passed in the meantime
          if (currentState.auction.passedSeats.includes(bot.seat)) {
            return;
          }

          const { getBotAction } = require('../../game/bot');
          const botAction = getBotAction(currentState, bot.seat);
          if (botAction) {
            await processGameAction(_io, gameId, botAction);
          }
        } catch (err) {
          console.error(`[bot auction-play] failed for seat ${bot.seat}:`, err.message);
        }
      }, 1500 + Math.random() * 1000);
    });
    return;
  }

  const nextPlayer = state.players.find(p => p.seat === state.currentTurnSeat);
  if (nextPlayer?.isBot && state.status === 'active') {
    setTimeout(async () => {
      try {
        const currentState = await loadGameState(gameId);
        if (!currentState || currentState.currentTurnSeat !== nextPlayer.seat || currentState.status !== 'active') {
          return;
        }
        const { getBotAction } = require('../../game/bot');
        const botAction = getBotAction(currentState, nextPlayer.seat);
        if (botAction) {
          await processGameAction(_io, gameId, botAction);
        }
      } catch (err) {
        console.error(`[bot auto-play] failed for seat ${nextPlayer.seat}:`, err.message);
      }
    }, 1500);
  }
}

module.exports = { initSocket, processGameAction, markPlayerAsBot, emitToGame, triggerBotPlay };
