const mongoose = require("mongoose");
const crypto = require("crypto");
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
const { emitToGame } = require("../services/realtime/socketServer");

const GAME_STATE_KEY = (gameId) => `game:${gameId}:state`;

async function loadGameState(gameId) {
  const raw = await redis.get(GAME_STATE_KEY(gameId));
  if (raw) return JSON.parse(raw);
  
  // Miss recovery: restore from snapshot
  const snapshot = await Snapshot.findOne({ gameId }).sort({ lastSeq: -1 }).lean();
  if (!snapshot) return null;
  const moves = await Move.find({ gameId, seq: { $gt: snapshot.lastSeq } }).sort({ seq: 1 }).lean();
  let state = snapshot.state;
  const { applyMove } = require('../game/rules');
  for (const move of moves) {
    try {
      state = applyMove(state, move.payload);
    } catch (e) {
      break;
    }
  }
  await redis.set(GAME_STATE_KEY(gameId), JSON.stringify(state));
  return state;
}

async function saveGameState(gameId, state) {
  if (state && state.status === 'active') {
    const timePerTurn = (state.settings?.timePerTurnSec || 90) * 1000;
    state.turnDeadline = Date.now() + timePerTurn;
  }
  await redis.set(GAME_STATE_KEY(gameId), JSON.stringify(state));
}

exports.createAiGame = catchAsync(async (req, res, next) => {
  const user = await getOrCreateUser(req, next);
  if (!user) return;

  const gameId = crypto.randomUUID();
  let roomCode;
  let attempts = 0;
  do {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existing = await Game.findOne({ roomCode });
    if (!existing) break;
    attempts++;
  } while (attempts < 5);

  const difficulty = req.body.difficulty || 'medium';

  const players = [
    {
      userId: user._id,
      providerId: user.providerId,
      seat: 0,
      displayName: user.displayName || user.username || "Player",
      balance: 1500,
      isReady: true,
      isBot: false,
    },
    {
      userId: new mongoose.Types.ObjectId(),
      providerId: "bot_" + difficulty + "_" + crypto.randomUUID().substring(0, 8),
      seat: 1,
      displayName: "AI (" + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + ")",
      balance: 1500,
      isReady: true,
      isBot: true,
    }
  ];

  const settings = {
    maxPlayers: 2,
    timePerTurnSec: 90,
    mode: 'vs_computer',
    allowTrading: true,
    freeParkingMoney: 0,
    boardTheme: 'flat',
  };

  const game = await Game.create({
    gameId,
    roomCode,
    hostUserId: user._id,
    players,
    settings,
    status: 'active',
    startedAt: new Date(),
    lastMoveSeq: 0,
  });

  const initialState = createInitialState(game, players);
  // Store bot difficulty in state so bot logic retrieves it correctly
  initialState.players[0].botDifficulty = null;
  initialState.players[1].botDifficulty = difficulty;
  initialState.settings.botDifficulty = difficulty;
  
  await saveGameState(gameId, initialState);

  await AuditLog.create({
    level: "info",
    gameId,
    userId: user._id,
    message: "VS AI Game created and started",
    metadata: { difficulty },
  }).catch(() => null);

  return responseHandler(res, {
    gameId,
    playerId: user._id,
    aiPlayer: players[1],
    state: initialState
  }, "VS Computer game created successfully", 201);
});

exports.rollDice = catchAsync(async (req, res, next) => {
  const { gameId } = req.body;
  if (!gameId) return next(commonError(400, "BadRequest", "Missing game id"));

  const user = await getOrCreateUser(req, next);
  if (!user) return;

  const lockKey = `lock:game:${gameId}`;
  const lockId = await acquireLock(lockKey, 5000);
  if (!lockId) return next(commonError(503, "Busy", "Game is busy, retry"));

  try {
    const state = await loadGameState(gameId);
    if (!state) return next(commonError(404, "GameNotFound", "Game state not found"));

    if (state.status !== 'active') return next(commonError(400, "InvalidState", "Game is not active"));

    const player = state.players.find(p => p.userId === user._id.toString() || p.providerId === user.providerId);
    if (!player) return next(commonError(403, "Forbidden", "You are not a player in this game"));

    if (state.currentTurnSeat !== player.seat) {
      return next(commonError(400, "NotYourTurn", "It is not your turn"));
    }

    if (state.phase !== 'roll') {
      return next(commonError(400, "InvalidPhase", "Cannot roll dice in phase " + state.phase));
    }

    const roll = [
      Math.ceil(Math.random() * 6),
      Math.ceil(Math.random() * 6),
    ];

    state.tempDice = roll;
    await saveGameState(gameId, state);

    emitToGame(gameId, "dice_rolled", { seat: player.seat, dice: roll });

    return responseHandler(res, { roll, state }, "Dice rolled successfully", 200);
  } finally {
    await releaseLock(lockKey, lockId);
  }
});

exports.movePlayer = catchAsync(async (req, res, next) => {
  const { gameId } = req.body;
  if (!gameId) return next(commonError(400, "BadRequest", "Missing game id"));

  const user = await getOrCreateUser(req, next);
  if (!user) return;

  const lockKey = `lock:game:${gameId}`;
  const lockId = await acquireLock(lockKey, 5000);
  if (!lockId) return next(commonError(503, "Busy", "Game is busy, retry"));

  try {
    let state = await loadGameState(gameId);
    if (!state) return next(commonError(404, "GameNotFound", "Game state not found"));

    if (state.status !== 'active') return next(commonError(400, "InvalidState", "Game is not active"));

    const player = state.players.find(p => p.userId === user._id.toString() || p.providerId === user.providerId);
    if (!player) return next(commonError(403, "Forbidden", "You are not a player in this game"));

    if (state.currentTurnSeat !== player.seat) {
      return next(commonError(400, "NotYourTurn", "It is not your turn"));
    }

    if (!state.tempDice || !Array.isArray(state.tempDice)) {
      return next(commonError(400, "NoDiceRoll", "You must roll dice first"));
    }

    const dice = state.tempDice;
    delete state.tempDice;

    const { applyMove } = require("../game/rules");
    const newState = applyMove(state, { type: 'ROLL_DICE', dice, seat: player.seat });
    
    await saveGameState(gameId, newState);

    await Move.create({
      gameId,
      seq: Date.now(),
      type: 'ROLL_DICE',
      payload: { type: 'ROLL_DICE', dice, seat: player.seat },
      playerUserId: user._id,
    }).catch(() => null);

    emitToGame(gameId, "state_update", newState);

    return responseHandler(res, { state: newState }, "Player moved successfully", 200);
  } finally {
    await releaseLock(lockKey, lockId);
  }
});

exports.endTurn = catchAsync(async (req, res, next) => {
  const { gameId } = req.body;
  if (!gameId) return next(commonError(400, "BadRequest", "Missing game id"));

  const user = await getOrCreateUser(req, next);
  if (!user) return;

  const lockKey = `lock:game:${gameId}`;
  const lockId = await acquireLock(lockKey, 5000);
  if (!lockId) return next(commonError(503, "Busy", "Game is busy, retry"));

  try {
    let state = await loadGameState(gameId);
    if (!state) return next(commonError(404, "GameNotFound", "Game state not found"));

    if (state.status !== 'active') return next(commonError(400, "InvalidState", "Game is not active"));

    const player = state.players.find(p => p.userId === user._id.toString() || p.providerId === user.providerId);
    if (!player) return next(commonError(403, "Forbidden", "You are not a player in this game"));

    if (state.currentTurnSeat !== player.seat) {
      return next(commonError(400, "NotYourTurn", "It is not your turn"));
    }

    if (state.phase !== 'manage') {
      return next(commonError(400, "InvalidPhase", "Cannot end turn in phase " + state.phase));
    }

    const { applyMove } = require("../game/rules");
    const { getBotAction } = require("../game/bot");
    
    let newState = applyMove(state, { type: 'END_TURN', seat: player.seat });
    
    await Move.create({
      gameId,
      seq: Date.now(),
      type: 'END_TURN',
      payload: { type: 'END_TURN', seat: player.seat },
      playerUserId: user._id,
    }).catch(() => null);

    let safetyCounter = 0;
    while (true) {
      const activePlayer = newState.players.find(p => p.seat === newState.currentTurnSeat);
      if (!activePlayer || !activePlayer.isBot || newState.status !== 'active') {
        break;
      }

      if (safetyCounter++ > 15) {
        console.error("[endTurn] AI turn loop safety threshold reached!");
        break;
      }

      if (newState.phase === 'auction') {
        // Auction involves multiple players acting concurrently, so we cannot loop synchronously
        break;
      }

      const botAction = getBotAction(newState, activePlayer.seat);
      if (!botAction) {
        console.log(`[endTurn] AI (seat ${activePlayer.seat}) decides: null (waiting)`);
        break;
      }
      console.log(`[endTurn] AI (seat ${activePlayer.seat}) decides:`, botAction.type);

      if (botAction.type === 'ROLL_DICE' && (!botAction.dice || botAction.dice.length !== 2)) {
        botAction.dice = [
          Math.ceil(Math.random() * 6),
          Math.ceil(Math.random() * 6),
        ];
      }

      newState = applyMove(newState, botAction);

      await Move.create({
        gameId,
        seq: Date.now() + safetyCounter,
        type: botAction.type,
        payload: botAction,
        playerUserId: null,
      }).catch(() => null);
    }

    await saveGameState(gameId, newState);

    if (newState.status === 'finished') {
      await Game.findOneAndUpdate({ gameId }, { status: 'finished', endedAt: new Date() }).catch(() => null);
      emitToGame(gameId, "game_over", {
        winnerSeat: newState.players.find(p => !p.isBankrupt)?.seat,
      });
    }

    emitToGame(gameId, "state_update", newState);

    return responseHandler(res, { state: newState }, "Turn processed successfully", 200);
  } finally {
    await releaseLock(lockKey, lockId);
  }
});

exports.getGame = catchAsync(async (req, res, next) => {
  const { gameId } = req.params;
  if (!gameId) return next(commonError(400, "BadRequest", "Missing game id"));

  const state = await loadGameState(gameId);
  if (!state) return next(commonError(404, "GameNotFound", "Game not found"));

  return responseHandler(res, { state }, "Game fetched successfully", 200);
});
