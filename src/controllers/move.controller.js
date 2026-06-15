// src/controllers/move.controller.js
const mongoose = require("mongoose");
const Move = require("../models/move.model");
const Game = require("../models/game.model");
const Snapshot = require("../models/snapshot.model");
const responseHandler = require("../utils/response_handler");
const { commonError } = require("../utils/error");
const catchAsync = require("../utils/catch_async");
const AuditLog = require("../models/audit.model");

/**
 * Append a move (for fallback/offline REST-based moves).
 * Note: the preferred path for real-time play is via Socket.IO.
 *
 * Body: { clientMoveId, type, payload }
 *
 * Important: server must be authoritative. We assume middleware validated move payload semantics.
 */
exports.createMove = catchAsync(async (req, res, next) => {
  const { gameId } = req.params;
  const { clientMoveId, type, payload } = req.body;

  if (!gameId) return next(commonError(400, "BadRequest", "Missing game id"));
  if (!type) return next(commonError(400, "BadRequest", "Missing move type"));

  // pick up authenticated player
  const clerkUser =
    req.auth && typeof req.auth === "function" ? req.auth() : req.auth || {};
  const providerId = clerkUser?.userId;
  if (!providerId)
    return next(commonError(401, "Unauthenticated", "Missing auth"));

  // find user
  const user = await mongoose.model("User").findOne({ providerId });
  if (!user)
    return next(
      commonError(404, "UserNotRegistered", "User is not registered in DB")
    );

  // load the game doc to ensure active
  const game = await Game.findOne({ gameId });
  if (!game) return next(commonError(404, "GameNotFound", "Game not found"));
  if (game.status !== "active")
    return next(commonError(400, "InvalidState", "Game is not active"));

  // compute server seq in transaction-like manner by using a findOneAndUpdate
  // increment lastMoveSeq atomically and use the new value
  // NOTE: This simple approach assumes single process or additional Redis locks in multi-node.
  const updated = await Game.findOneAndUpdate(
    { gameId },
    { $inc: { lastMoveSeq: 1 } },
    { new: true }
  );

  const seq = updated.lastMoveSeq;

  // Try insert move with seq; unique index will protect duplicates
  try {
    const move = await Move.create({
      gameId,
      seq,
      clientMoveId,
      type,
      payload,
      playerUserId: user._id,
    });

    // Write lightweight audit
    AuditLog.create({
      level: "info",
      gameId,
      userId: user._id,
      message: "Move created",
      metadata: { type, seq, clientMoveId },
    }).catch(() => null);

    // Optionally: schedule snapshot on every N moves (background worker). For now leave this to worker.
    return responseHandler(res, { move }, "Move recorded", 201);
  } catch (err) {
    // If insertion fails because of duplicate seq, return conflict and let client re-sync.
    if (err.code === 11000) {
      return next(commonError(409, "Conflict", "Move conflict or duplicate"));
    }
    throw err;
  }
});

/**
 * Get moves (paginated) for a user/game combination
 * Query: limit, page
 */
exports.getMovesForGame = catchAsync(async (req, res, next) => {
  const { gameId } = req.params;
  const limit = Math.min(parseInt(req.query.limit || "200", 10), 1000);
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);

  if (!gameId) return next(commonError(400, "BadRequest", "Missing game id"));

  const [moves, total] = await Promise.all([
    Move.find({ gameId })
      .sort({ seq: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Move.countDocuments({ gameId }),
  ]);

  return responseHandler(res, "Moves fetched", 200, {
    moves,
    page,
    limit,
    total,
  });
});
