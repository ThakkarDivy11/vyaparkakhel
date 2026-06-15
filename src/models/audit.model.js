// src/models/audit.model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

/*
Audit logs are append-only and store administrative / detection events.
Keep them lightweight and insert-only; rotate/archive in production.
*/
const AuditSchema = new Schema({
  level: {
    type: String,
    enum: ["info", "warn", "error", "security", "cheat"],
    default: "info",
  },
  gameId: { type: String, index: true },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    index: true,
    sparse: true,
  },
  message: { type: String, required: true, maxlength: 2000 },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("AuditLog", AuditSchema);
