// src/controllers/audit.controller.js
const AuditLog = require("../models/audit.model");
const responseHandler = require("../utils/response_handler");
const { commonError } = require("../utils/error");
const catchAsync = require("../utils/catch_async");

/**
 * Create an audit log entry (internal use)
 * Body: { level, gameId, message, metadata }
 */
exports.createAudit = catchAsync(async (req, res, next) => {
  const { level = "info", gameId = null, message, metadata = {} } = req.body;
  if (!message)
    return next(commonError(400, "BadRequest", "message is required"));

  const entry = await AuditLog.create({ level, gameId, message, metadata });
  return responseHandler(res, "Audit created", 201, { entry });
});

/**
 * List audits with pagination & filters (admin or debug)
 * Query: page, limit, level, gameId
 */
exports.listAudits = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 500);
  const filter = {};
  if (req.query.level) filter.level = req.query.level;
  if (req.query.gameId) filter.gameId = req.query.gameId;
  if (req.query.userId) filter.userId = req.query.userId;

  const entries = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const total = await AuditLog.countDocuments(filter);
  return responseHandler(res, "Audit entries", 200, {
    entries,
    page,
    limit,
    total,
  });
});
