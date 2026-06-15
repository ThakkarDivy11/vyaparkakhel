// src/models/move.model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

/*
Moves are append-only. Each move is a single atomic event which is validated
by server's rules engine. Move payloads should be compact and deterministic.
*/
const MoveSchema = new Schema(
  {
    gameId: { type: String, required: true, index: true },
    seq: { type: Number, required: true }, // server sequence, monotonically increasing
    clientMoveId: { type: String, trim: true, maxlength: 200 }, // idempotency token from client
    type: {
      type: String,
      required: true,
      enum: [
        'ROLL_DICE', 'PAY_BAIL', 'USE_JAIL_FREE_CARD',
        'BUY_PROPERTY', 'DECLINE_PROPERTY',
        'AUCTION_BID', 'AUCTION_PASS',
        'BUILD_HOUSE', 'SELL_HOUSE', 'MORTGAGE', 'UNMORTGAGE',
        'OFFER_TRADE', 'ACCEPT_TRADE', 'REJECT_TRADE', 'CANCEL_TRADE',
        'END_TURN', 'DECLARE_BANKRUPTCY', 'TIMEOUT',
        'system',
      ],
    },
    payload: { type: Schema.Types.Mixed }, // small JSON for move specifics
    playerUserId: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { strict: true }
);

/* Unique constraint to ensure same (gameId, seq) is not written twice */
MoveSchema.index({ gameId: 1, seq: 1 }, { unique: true, background: true });

/* Optional small compound index to query by player moves */
MoveSchema.index({ gameId: 1, playerUserId: 1, seq: -1 });

module.exports = mongoose.model("Move", MoveSchema);
