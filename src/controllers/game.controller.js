// src/controllers/game.controller.js
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Game = require("../models/game.model");
const Move = require("../models/move.model");
const Snapshot = require("../models/snapshot.model");
const User = require("../models/user.model");
const AuditLog = require("../models/audit.model");
const responseHandler = require("../utils/response_handler");
const { commonError } = require("../utils/error");
const catchAsync = require("../utils/catch_async");
const { getOrCreateUser } = require("../utils/get_or_create_user");
const { createInitialState } = require("../game/state");
const { redis, acquireLock, releaseLock } = require("../services/redis/redisClient");
// Socket broadcaster — best-effort; if io isn't up we silently no-op.
const { emitToGame, triggerBotPlay } = require("../services/realtime/socketServer");

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (no I, O, 0, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a new game.
 * Body: settings (validated via Joi before hitting controller).
 */
exports.createGame = catchAsync(async (req, res, next) => {
  const user = await getOrCreateUser(req, next);
  if (!user) return;

  // Build initial players array with host only (others will join)
  const gameId = uuidv4();
  let roomCode;
  let attempts = 0;
  do {
    roomCode = generateRoomCode();
    const existing = await Game.findOne({ roomCode });
    if (!existing) break;
    attempts++;
  } while (attempts < 5);
  const settings = req.validated?.settings || req.body.settings || {};
  
  let players = [];
  console.log('[createGame] mode:', settings.mode, 'playerNames:', req.body.playerNames);
  if (settings.mode === 'pass_and_play') {
    const playerNames = req.validated?.playerNames || req.body.playerNames || ['Player 1', 'Player 2'];
    console.log('[createGame] resolved playerNames:', playerNames);
    players = playerNames.map((name, index) => ({
      userId: user._id,
      providerId: user.providerId,
      seat: index,
      displayName: name,
      balance: 1500, cosmetics: user?.wallet?.cosmetics || [],
      isReady: true,
    }));
  } else if (settings.mode === 'vs_computer') {
    const playerNames = req.validated?.playerNames || req.body.playerNames || ['Player 1', 'Bot 1'];
    console.log('[createGame] resolved playerNames for bot mode:', playerNames);
    players = playerNames.map((name, index) => ({
      userId: user._id,
      providerId: index === 0 ? user.providerId : null,
      seat: index,
      displayName: name,
      balance: 1500, cosmetics: user?.wallet?.cosmetics || [],
      isReady: true,
      isBot: index > 0,
    }));
  } else {
    players = [{
      userId: user._id,
      providerId: user.providerId,
      seat: 0,
      displayName: user.displayName || user.username,
      balance: 1500, cosmetics: user?.wallet?.cosmetics || [],
      isReady: true,
    }];
  }

  const game = await Game.create({
    gameId,
    roomCode,
    hostUserId: user._id,
    players,
    settings,
  });

  await AuditLog.create({
    level: "info",
    gameId,
    userId: user._id,
    message: "Game created",
    metadata: { settings },
  }).catch(() => null);

  return responseHandler(res, { game }, "Game created", 201);
});

/**
 * Join a waiting game
 * Params: gameId
 * Body: displayName (optional), seat (optional)
 */
exports.joinGame = catchAsync(async (req, res, next) => {
  const { gameId } = req.params;
  if (!gameId) return next(commonError(400, "BadRequest", "Missing game id"));

  const user = await getOrCreateUser(req, next);
  if (!user) return;

  // Hold a Redis lock during the read-modify-write so two concurrent
  // join requests for the same user (e.g. React StrictMode double-mount)
  // can't both pass the dedup check and both insert a player.
  const lockKey = `lock:join:${gameId}`;
  const lockId = await acquireLock(lockKey, 5000);
  if (!lockId) return next(commonError(503, "Busy", "Game is busy, retry"));

  let game;
  try {
    game = await Game.findOne({ gameId });
    if (!game) return next(commonError(404, "GameNotFound", "Game not found"));
    if (game.status !== "waiting")
      return next(commonError(400, "InvalidGameState", "Game is not joinable"));

    // Self-heal: remove any duplicate player entries by userId. Legacy data
    // from before the join Redis lock may have ended up with the same user
    // listed twice, which inflates the player count and blocks new joiners.
    const seenUserIds = new Set();
    const dedupedPlayers = [];
    for (const p of game.players) {
      const key = p.userId.toString();
      if (seenUserIds.has(key)) continue;
      seenUserIds.add(key);
      dedupedPlayers.push(p);
    }
    if (dedupedPlayers.length !== game.players.length) {
      game.players = dedupedPlayers;
      // Save the cleanup so subsequent reads see the deduped list. Don't
      // gate on this — even if save fails we can still proceed with the
      // in-memory deduped array for the join check below.
      await game.save().catch((err) => {
        console.error("[joinGame] dedupe save failed:", err.message);
      });
    }

    // Already joined — idempotent return
    if (game.players.some((p) => p.userId.toString() === user._id.toString())) {
      return responseHandler(res, { game }, "Already joined", 200);
    }

    if (game.players.length >= (game.settings?.maxPlayers || 4))
      return next(commonError(400, "Full", "Game is already full"));

    // Compute seat (choose lowest empty seat)
    const occupied = new Set(game.players.map((p) => p.seat));
    let seat = 0;
    while (occupied.has(seat) && seat < (game.settings?.maxPlayers || 4)) seat++;
    const displayName =
      req.validated?.displayName ||
      req.body.displayName ||
      user.displayName ||
      user.username;

    game.players.push({
      userId: user._id,
      providerId: user.providerId,
      seat,
      displayName,
      balance: 1500, cosmetics: user?.wallet?.cosmetics || [],
      isReady: true, // Auto-ready: joining a private room implies you're ready
    });

    await game.save();

    await AuditLog.create({
      level: "info",
      gameId,
      userId: user._id,
      message: "Player joined",
      metadata: { seat },
    }).catch(() => null);
  } finally {
    await releaseLock(lockKey, lockId);
  }

  return responseHandler(res, { game }, "Joined game", 200);
});

/**
 * Start game (host-only)
 * This will set status to active and startedAt
 */
exports.startGame = catchAsync(async (req, res, next) => {
  const { gameId } = req.params;
  if (!gameId) return next(commonError(400, "BadRequest", "Missing game id"));

  const user = await getOrCreateUser(req, next);
  if (!user) return;

  const session = await mongoose.startSession();
  try {
    let startedGame = null;
    let startedInitialState = null;
    await session.withTransaction(async () => {
      // lock via transaction: verify host is starting
      const game = await Game.findOne({ gameId }).session(session);
      if (!game) {
        console.error(`[startGame] game not found: ${gameId}`);
        throw commonError(404, "GameNotFound", "Game not found");
      }
      console.log(`[startGame] gameId=${gameId} status=${game.status} host=${game.hostUserId} caller=${user._id}`);
      if (game.hostUserId.toString() !== user._id.toString()) {
        console.error(`[startGame] host mismatch: expected=${game.hostUserId} got=${user._id}`);
        throw commonError(403, "Forbidden", "Only host can start the game");
      }
      if (game.status !== "waiting") {
        console.error(`[startGame] not waiting: status=${game.status}`);
        throw commonError(400, "InvalidState", `Game cannot be started (status: ${game.status})`);
      }

      // Self-heal: dedupe player array by userId before starting (same fix
      // as joinGame; legacy data may have duplicates that would create two
      // player records in the running state).
      const isPassAndPlay = game.settings?.mode === 'pass_and_play';
      const isVsComputer = game.settings?.mode === 'vs_computer';
      const skipDedupe = isPassAndPlay || isVsComputer;
      const seenUserIds = new Set();
      game.players = game.players.filter((p) => {
        const k = p.userId.toString();
        if (!skipDedupe && seenUserIds.has(k)) return false;
        seenUserIds.add(k);
        return true;
      });

      game.status = "active";
      game.startedAt = new Date();
      game.lastMoveSeq = 0;
      try {
        await game.save({ session });
      } catch (saveErr) {
        console.error(`[startGame] save failed:`, saveErr.message, saveErr.errors);
        throw commonError(400, "SaveFailed", `Could not save game: ${saveErr.message}`);
      }

      // Seed Redis with the initial game state (rules engine reads from here)
      const initialState = createInitialState(game, game.players);
      await redis.set(`game:${game.gameId}:state`, JSON.stringify(initialState));

      startedGame = game;
      startedInitialState = initialState;
    });
    await AuditLog.create({
      level: "info",
      gameId,
      userId: user._id,
      message: "Game started",
    }).catch(() => null);

    // Broadcast to everyone in the room so the waiting-room page transitions
    // to the active board view without anyone needing to click Start again.
    if (startedInitialState) {
      emitToGame(gameId, "state_update", startedInitialState);
      emitToGame(gameId, "game_started", { gameId });
      if (triggerBotPlay) {
        triggerBotPlay(gameId, startedInitialState);
      }
    }

    return responseHandler(res, { game: startedGame }, "Game started", 200);
  } catch (err) {
    return next(err);
  } finally {
    session.endSession();
  }
});

/**
 * Fetch a game (include last snapshot hint + small player info)
 */
exports.getGame = catchAsync(async (req, res, next) => {
  const { gameId } = req.params;
  if (!gameId) return next(commonError(400, "BadRequest", "Missing game id"));

  const game = await Game.findOne({ gameId })
    .populate("hostUserId", "username displayName avatarUrl")
    .lean();
  if (!game) return next(commonError(404, "GameNotFound", "Game not found"));

  // Pull last snapshot id for quick client-side rehydrate
  const latestSnapshot = await Snapshot.findOne({ gameId })
    .sort({ lastSeq: -1 })
    .limit(1)
    .lean();

  return responseHandler(res, { game, latestSnapshot }, "Game fetched", 200);
});

/**
 * Paginated moves history for replay
 * Query: page, limit, afterSeq (optional)
 */
exports.getHistory = catchAsync(async (req, res, next) => {
  const { gameId } = req.params;
  const afterSeq = parseInt(req.query.afterSeq || "0", 10);
  const limit = Math.min(parseInt(req.query.limit || "200", 10), 1000);
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);

  if (!gameId) return next(commonError(400, "BadRequest", "Missing game id"));

  const filter = { gameId };
  if (afterSeq > 0) filter.seq = { $gt: afterSeq };

  const moves = await Move.find(filter)
    .sort({ seq: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const total = await Move.countDocuments({ gameId });

  return responseHandler(
    res,
    { moves, page, limit, total },
    "Move history",
    200
  );
});

/**
 * Finalize a finished game (admin/host). Will compute ranks and update user stats.
 * This is a heavier operation and must be done transactionally.
 * Expected body: result: { rankings: [{ userId, rank, finalBalance }] }
 */
exports.finalizeGame = catchAsync(async (req, res, next) => {
  const { gameId } = req.params;
  const { result } = req.body;
  if (!gameId) return next(commonError(400, "BadRequest", "Missing game id"));
  if (!result || !Array.isArray(result.rankings))
    return next(commonError(400, "BadRequest", "Missing result rankings"));

  // auth: only host or admin may finalize
  const actor = await getOrCreateUser(req, next);
  if (!actor) return;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const game = await Game.findOne({ gameId }).session(session);
      if (!game) throw commonError(404, "GameNotFound", "Game not found");
      // allow host or admin
      if (
        game.hostUserId.toString() !== actor._id.toString() &&
        actor.role !== "admin"
      ) {
        throw commonError(
          403,
          "Forbidden",
          "Only host or admin can finalize a game"
        );
      }
      // update game doc
      game.status = "finished";
      game.endedAt = new Date();
      game.result = {
        winnerUserId:
          result.rankings && result.rankings.length
            ? result.rankings[0].userId
            : null,
        rankings: result.rankings.map((r) => ({
          userId: mongoose.Types.ObjectId(r.userId),
          rank: r.rank,
          finalBalance: r.finalBalance,
        })),
        endedAt: new Date(),
      };
      await game.save({ session });

      // update per-user stats
      const updates = result.rankings.map((ranking) => {
        const inc = { "stats.gamesPlayed": 1 };
        if (ranking.rank === 1) inc["stats.wins"] = 1;
        if (ranking.finalBalance)
          inc["stats.totalEarnings"] = ranking.finalBalance;
        return {
          updateOne: {
            filter: { _id: mongoose.Types.ObjectId(ranking.userId) },
            update: { $inc: inc, $set: { "stats.lastActiveAt": new Date() } },
          },
        };
      });
      if (updates.length) {
        await User.bulkWrite(updates, { session });
      }

      // create audit
      await AuditLog.create(
        [
          {
            level: "info",
            gameId,
            userId: actor._id,
            message: "Game finalized",
            metadata: { result },
          },
        ],
        { session }
      );
    });

    return responseHandler(res, {}, "Game finalized", 200);
  } catch (err) {
    return next(err);
  } finally {
    session.endSession();
  }
});

exports.getGameByCode = catchAsync(async (req, res, next) => {
  const { code } = req.params;
  if (!code) return next(commonError(400, 'BadRequest', 'Missing room code'));
  const game = await Game.findOne({ roomCode: code.toUpperCase() })
    .populate('hostUserId', 'username displayName avatarUrl')
    .lean();
  if (!game) return next(commonError(404, 'GameNotFound', 'No game with that code'));
  return responseHandler(res, { game }, 'Game fetched', 200);
});

exports.getMyGames = catchAsync(async (req, res, next) => {
  const user = await getOrCreateUser(req, next);
  if (!user) return;

  const games = await Game.find({
    "players.userId": user._id,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("hostUserId", "username displayName avatarUrl")
    .lean();

  return responseHandler(res, { games }, "User games fetched", 200);
});
