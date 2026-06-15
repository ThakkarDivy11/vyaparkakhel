// src/controllers/leaderboard.controller.js
const mongoose = require("mongoose");
const User = require("../models/user.model");
const Game = require("../models/game.model");
const responseHandler = require("../utils/response_handler");
const catchAsync = require("../utils/catch_async");

/**
 * Leaderboard aggregation: top users by wins, gamesPlayed or totalEarnings
 * Query: metric=wins|gamesPlayed|totalEarnings, limit, page
 */
exports.getLeaderboard = catchAsync(async (req, res) => {
  const metric = req.query.metric || "wins"; // wins, gamesPlayed, totalEarnings
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);

  // map metric to stats field
  const metricField =
    metric === "totalEarnings"
      ? "stats.totalEarnings"
      : metric === "gamesPlayed"
        ? "stats.gamesPlayed"
        : "stats.wins";

  const pipeline = [
    { $match: { [metricField]: { $exists: true } } },
    {
      $project: {
        username: 1,
        displayName: 1,
        avatarUrl: 1,
        wins: "$stats.wins",
        gamesPlayed: "$stats.gamesPlayed",
        totalEarnings: "$stats.totalEarnings",
      },
    },
    { $sort: { [metricField]: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ];

  const results = await User.aggregate(pipeline).option({ allowDiskUse: true });
  return responseHandler(
    res,
    { results, metric, page, limit },
    "Leaderboard",
    200
  );
});

/**
 * Season leaderboard snapshot (example): compute aggregated leaderboard for finished games
 * This uses aggregation on games collection to compute top winners by counting game results.
 * Query: metric= wins | finalBalance
 */
exports.getSeasonSnapshot = catchAsync(async (req, res) => {
  const metric =
    req.query.metric === "finalBalance"
      ? "result.rankings.finalBalance"
      : "result.winnerUserId";
  // This endpoint is illustrative; a production pipeline would be more elaborate (grouping by season, etc.)
  const pipeline = [
    { $match: { status: "finished" } },
    { $unwind: "$result.rankings" },
    {
      $group: {
        _id: "$result.rankings.userId",
        wins: {
          $sum: { $cond: [{ $eq: ["$result.rankings.rank", 1] }, 1, 0] },
        },
        totalFinalBalance: { $sum: "$result.rankings.finalBalance" },
      },
    },
    { $sort: { wins: -1, totalFinalBalance: -1 } },
    { $limit: 100 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        userId: "$_id",
        username: "$user.username",
        displayName: "$user.displayName",
        wins: 1,
        totalFinalBalance: 1,
      },
    },
  ];

  const snapshot = await Game.aggregate(pipeline).option({
    allowDiskUse: true,
  });
  return responseHandler(res, { snapshot }, "Season snapshot", 200);
});
