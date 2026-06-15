// src/models/user.model.js
const mongoose = require("mongoose");
const validator = require("validator");

const { Schema } = mongoose;

const DeviceSchema = new Schema(
  {
    deviceId: { type: String, trim: true, maxlength: 200 },
    deviceType: {
      type: String,
      trim: true,
      enum: ["android", "ios", "web", "desktop", "other"],
      default: "web",
    },
    lastSeenAt: { type: Date, default: Date.now },
    ip: { type: String, trim: true, maxlength: 45 }, // IPv6 length
  },
  { _id: false }
);

const LocationSchema = new Schema(
  {
    country: { type: String, trim: true, maxlength: 100 },
    region: { type: String, trim: true, maxlength: 100 },
    city: { type: String, trim: true, maxlength: 100 },
    lat: { type: Number },
    lon: { type: Number },
  },
  { _id: false }
);

const StatsSchema = new Schema(
  {
    gamesPlayed: { type: Number, default: 0, min: 0 },
    wins: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0 }, // used for leaderboards
    currentSeasonScore: { type: Number, default: 0 },
    lastActiveAt: { type: Date },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "username is required"],
      unique: true,
      trim: true,
      minlength: [3, "username must be at least 3 characters"],
      maxlength: [30, "username max length is 30"],
      lowercase: true,
      match: [
        /^[a-z0-9._-]+$/,
        "username can contain lowercase letters, numbers, -, _, .",
      ],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      sparse: true,
      validate: {
        validator: function (v) {
          return !v || validator.isEmail(v);
        },
        message: "invalid email",
      },
    },
    phone: { type: String, trim: true, index: true, sparse: true },
    // auth provider id (Clerk/Google/FB) optional
    providerId: { type: String, trim: true, index: true, sparse: true },

    displayName: { type: String, trim: true, maxlength: 60 },
    avatarUrl: { type: String, trim: true },
    bio: { type: String, maxlength: 500, trim: true },

    // demographics & optional analytics data
    gender: {
      type: String,
      enum: ["male", "female", "other", "unspecified"],
      default: "unspecified",
    },
    dob: { type: Date }, // optional
    locale: { type: String, trim: true, maxlength: 10 }, // e.g. en-US
    timezone: { type: String, trim: true, maxlength: 50 },

    devices: { type: [DeviceSchema], default: [] },
    lastLoginAt: { type: Date },

    location: { type: LocationSchema },

    // preferences & entitlements (minimal here; full entitlements in future)
    preferences: {
      defaultTokenSku: { type: String, trim: true, maxlength: 100 },
      defaultBoardSku: { type: String, trim: true, maxlength: 100 },
    },

    // aggregated stats (duplicate for fast reads; keep in sync via jobs or transactions)
    stats: { type: StatsSchema, default: () => ({}) },

    // soft-delete flag & role
    isBanned: { type: Boolean, default: false },
    bannedReason: { type: String, trim: true, maxlength: 500 },
    role: {
      type: String,
      enum: ["user", "admin", "moderator", "system"],
      default: "user",
    },
  },
  { timestamps: true, strict: true }
);

/*
Indexes:
 - username unique (casefold via lowercase)
 - email sparse index
 - phone sparse index
 - compound index for quick analytics queries: role + stats.gamesPlayed
*/
UserSchema.index({ username: 1 }, { unique: true, background: true });
UserSchema.index({ email: 1 }, { sparse: true, background: true });
UserSchema.index({ phone: 1 }, { sparse: true, background: true });
UserSchema.index({ "stats.gamesPlayed": -1, "stats.wins": -1 });

/*
Virtuals & helper methods
*/
UserSchema.virtual("winRate").get(function () {
  const s = this.stats || {};
  if (!s.gamesPlayed) return 0;
  return s.wins / s.gamesPlayed;
});

// transaction-safe stat increment helper
UserSchema.statics.incrementStats = async function (
  userId,
  { gamesPlayed = 0, wins = 0, totalEarnings = 0 },
  session = null
) {
  const update = {};
  if (gamesPlayed) update["$inc"] = { "stats.gamesPlayed": gamesPlayed };
  if (wins) {
    update["$inc"] = Object.assign(update["$inc"] || {}, {
      "stats.wins": wins,
    });
  }
  if (totalEarnings) {
    update["$inc"] = Object.assign(update["$inc"] || {}, {
      "stats.totalEarnings": totalEarnings,
    });
  }
  update["$set"] = { "stats.lastActiveAt": new Date() };
  return this.findByIdAndUpdate(userId, update, { new: true, session });
};

module.exports = mongoose.model("User", UserSchema);
