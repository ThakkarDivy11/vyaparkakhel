const Game = require("../models/game.model");
const Move = require("../models/move.model");
const responseHandler = require("../utils/response_handler");
const { commonError } = require("../utils/error");
const catchAsync = require("../utils/catch_async");
const { getOrCreateUser } = require("../utils/get_or_create_user");
const { redis, acquireLock, releaseLock } = require("../services/redis/redisClient");
const { emitToGame } = require("../services/realtime/socketServer");

const GAME_STATE_KEY = (gameId) => `game:${gameId}:state`;

async function loadGameState(gameId) {
  const raw = await redis.get(GAME_STATE_KEY(gameId));
  if (raw) return JSON.parse(raw);
  return null;
}

async function saveGameState(gameId, state) {
  if (state && state.status === 'active') {
    const timePerTurn = (state.settings?.timePerTurnSec || 90) * 1000;
    state.turnDeadline = Date.now() + timePerTurn;
  }
  await redis.set(GAME_STATE_KEY(gameId), JSON.stringify(state));
}

exports.buyProperty = catchAsync(async (req, res, next) => {
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

    if (state.phase !== 'post_roll') {
      return next(commonError(400, "InvalidPhase", "Cannot buy property in phase " + state.phase));
    }

    const { applyMove } = require("../game/rules");
    const newState = applyMove(state, { type: 'BUY_PROPERTY', seat: player.seat });
    
    await saveGameState(gameId, newState);

    await Move.create({
      gameId,
      seq: Date.now(),
      type: 'BUY_PROPERTY',
      payload: { type: 'BUY_PROPERTY', seat: player.seat },
      playerUserId: user._id,
    }).catch(() => null);

    emitToGame(gameId, "state_update", newState);

    return responseHandler(res, { state: newState }, "Property bought successfully", 200);
  } finally {
    await releaseLock(lockKey, lockId);
  }
});
