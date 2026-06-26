// src/models/game.model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const PlayerInGameSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    providerId: { type: String, trim: true }, // Clerk providerId — used for client player identification
    seat: { type: Number, required: true, min: 0, max: 9 }, // seating order (0..9, max 10 players)
    displayName: { type: String, trim: true, maxlength: 60 },
    avatarUrl: { type: String, trim: true },
    balance: { type: Number, default: 1500 }, // standard start balance
    position: { type: Number, default: 0 },
    inJail: { type: Boolean, default: false },
    jailTurns: { type: Number, default: 0 },
    properties: [{ type: String }], // property IDs or names (denormalize as needed)
    isReady: { type: Boolean, default: false }, // used in lobby
    isBot: { type: Boolean, default: false },
    cosmetics: [{ type: String }],
  },
  { _id: false }
);

const GameResultSchema = new Schema(
  {
    winnerUserId: { type: Schema.Types.ObjectId, ref: "User" },
    rankings: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        rank: { type: Number, min: 1 },
        finalBalance: { type: Number },
      },
    ],
    endedAt: { type: Date },
  },
  { _id: false }
);

const SettingsSchema = new Schema(
  {
    maxPlayers: { type: Number, default: 4, min: 2, max: 10 },
    timePerTurnSec: { type: Number, default: 60, min: 5, max: 3600 },
    mode: {
      type: String,
      enum: ["classic", "short", "custom", "pass_and_play", "vs_computer"],
      default: "classic",
    },
    allowTrading: { type: Boolean, default: true },
    freeParkingMoney: { type: Number, default: 0 },
    boardTheme: { type: String, default: "flat", enum: ["flat", "3d"] },
  },
  { _id: false }
);

const GameSchema = new Schema(
  {
    gameId: { type: String, required: true, unique: true, index: true }, // human-friendly UUID
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      minlength: 6,
      maxlength: 6,
    },
    hostUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    players: { type: [PlayerInGameSchema], default: [] },
    status: {
      type: String,
      enum: ["waiting", "active", "paused", "finished", "cancelled"],
      default: "waiting",
      index: true,
    },
    settings: { type: SettingsSchema, default: () => ({}) },
    currentTurnSeat: { type: Number, default: 0 },
    lastMoveSeq: { type: Number, default: 0 }, // convenience copy of last Move.seq
    startedAt: { type: Date },
    endedAt: { type: Date },
    snapshotRef: { type: Schema.Types.ObjectId, ref: "Snapshot" },
    result: { type: GameResultSchema },
    // optional metadata for analytics or season linking (null for phase A)
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, strict: true }
);

/* Indexes:
   - unique gameId
   - status + createdAt for listing active/waiting games
   - hostUserId for user-owned games
*/
GameSchema.index({ gameId: 1 }, { unique: true, background: true });
GameSchema.index({ roomCode: 1 }, { unique: true, background: true });
GameSchema.index({ status: 1, createdAt: -1 });
GameSchema.index({ hostUserId: 1, createdAt: -1 });

/* Helpers */
GameSchema.methods.incrementSeq = function (session = null) {
  // atomic increment using findOneAndUpdate when using update from outside is recommended.
  // This simple helper modifies the doc in-memory: prefer DB-level operations for concurrency.
  this.lastMoveSeq = (this.lastMoveSeq || 0) + 1;
  return this.lastMoveSeq;
};

module.exports = mongoose.model("Game", GameSchema);
