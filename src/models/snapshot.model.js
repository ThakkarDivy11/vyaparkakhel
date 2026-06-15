// src/models/snapshot.model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

/*
Snapshots store full denormalized game state at a point in time.
We will create snapshots every N moves to speed rehydrate.
*/
const SnapshotSchema = new Schema(
  {
    gameId: { type: String, required: true, index: true },
    lastSeq: { type: Number, required: true }, // last move seq included in this snapshot
    state: { type: Schema.Types.Mixed, required: true }, // full game state (players balances, positions, properties)
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { strict: true }
);

SnapshotSchema.index({ gameId: 1, lastSeq: -1 });

module.exports = mongoose.model("Snapshot", SnapshotSchema);
