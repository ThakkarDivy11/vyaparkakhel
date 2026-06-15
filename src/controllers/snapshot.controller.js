// src/controllers/snapshot.controller.js
const Snapshot = require("../models/snapshot.model");
const Game = require("../models/game.model");
const responseHandler = require("../utils/response_handler");
const { commonError } = require("../utils/error");
const catchAsync = require("../utils/catch_async");

/**
 * Create snapshot (background job or admin) - store full state
 * Body: { lastSeq, state }
 */
exports.createSnapshot = catchAsync(async (req, res, next) => {
  const { gameId } = req.params;
  const { lastSeq, state } = req.body;
  if (!gameId || typeof lastSeq !== "number" || !state) {
    return next(commonError(400, "BadRequest", "Missing data"));
  }

  // Persist snapshot
  const snapshot = await Snapshot.create({ gameId, lastSeq, state });
  // Optionally update Game.snapshotRef
  await Game.findOneAndUpdate({ gameId }, { snapshotRef: snapshot._id }).catch(
    () => null
  );

  return responseHandler(res, "Snapshot created", 201, { snapshot });
});

/**
 * Get latest snapshot for a game
 */
exports.getLatestSnapshot = catchAsync(async (req, res, next) => {
  const { gameId } = req.params;
  if (!gameId) return next(commonError(400, "BadRequest", "Missing game id"));

  const snap = await Snapshot.findOne({ gameId }).sort({ lastSeq: -1 }).lean();
  if (!snap)
    return responseHandler(res, { snapshot: null }, "No snapshot", 200);

  return responseHandler(res, "Snapshot fetched", 200, { snapshot: snap });
});
