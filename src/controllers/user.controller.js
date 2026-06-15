// src/controllers/user.controller.js
const mongoose = require("mongoose");
const User = require("../models/user.model");
const AuditLog = require("../models/audit.model");
const responseHandler = require("../utils/response_handler");
const { commonError } = require("../utils/error");
const catchAsync = require("../utils/catch_async");
const { getOrCreateUser } = require("../utils/get_or_create_user");

/**
 * Get current user's profile (authenticated via Clerk)
 * Uses req.auth() to get clerk user id and maps to providerId in our DB.
 */
exports.getMyProfile = catchAsync(async (req, res, next) => {
  const user = await getOrCreateUser(req, next);
  if (!user) return;

  return responseHandler(res, { user: user.toObject() }, "Profile fetched", 200);
});

/**
 * Update current user's profile (partial update)
 * Only allow safe fields via whitelist
 */
exports.updateMyProfile = catchAsync(async (req, res, next) => {
  const clerkUser =
    req.auth && typeof req.auth === "function" ? req.auth() : req.auth || {};
  const providerId = clerkUser?.userId;
  if (!providerId)
    return next(commonError(401, "Unauthenticated", "Missing auth"));

  // whitelist of editable fields
  const allowed = [
    "displayName",
    "avatarUrl",
    "bio",
    "locale",
    "timezone",
    "preferences",
    "location",
    "dob",
    "gender",
  ];
  const payload = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key))
      payload[key] = req.body[key];
  }
  if (Object.keys(payload).length === 0)
    return next(commonError(400, "BadRequest", "No valid fields provided"));

  const user = await User.findOneAndUpdate(
    { providerId },
    { $set: payload },
    { new: true }
  );
  if (!user)
    return next(commonError(404, "UserNotFound", "User not found in DB"));

  // Write a lightweight audit for profile change
  await AuditLog.create({
    level: "info",
    userId: user._id,
    message: "User updated profile",
    metadata: { changedFields: Object.keys(payload) },
  }).catch(() => null);

  return responseHandler(res, { user }, "Profile updated", 200);
});

/**
 * Admin-style listing of top players by wins or earnings using aggregation
 * Query params: metric= wins|totalEarnings (default wins), limit, page
 */
exports.getTopPlayers = catchAsync(async (req, res, next) => {
  const metric =
    req.query.metric === "totalEarnings" ? "stats.totalEarnings" : "stats.wins";
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);

  const pipeline = [
    { $match: { "stats.gamesPlayed": { $gt: 0 } } },
    {
      $project: {
        username: 1,
        displayName: 1,
        avatarUrl: 1,
        wins: "$stats.wins",
        totalEarnings: "$stats.totalEarnings",
      },
    },
    { $sort: { [metric]: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ];

  const results = await User.aggregate(pipeline).option({ allowDiskUse: true });
  return responseHandler(res, { results, page, limit }, "Top players", 200);
});

/**
 * Lookup user by ID (public) -- minimal view
 */
exports.getUserPublic = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId))
    return next(commonError(400, "BadRequest", "Invalid user id"));

  const user = await User.findById(
    userId,
    "username displayName avatarUrl stats"
  ).lean();
  if (!user) return next(commonError(404, "NotFound", "User not found"));

  return responseHandler(res, { user }, "User public profile", 200);
});
