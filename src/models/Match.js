import mongoose from "mongoose";

const MatchSchema = new mongoose.Schema(
  {
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Helps ensure unique pair
    uniquePairId: {
      type: String, // `${userA}_${userB}` sorted
      unique: true,
    },

    // Match status for controlling UI flow
    status: {
      type: String,
      enum: [
        "matched",     // both liked
        "unmatched",   // unmatched later
        "blocked",     // blocked by either
      ],
      default: "pending",
      index: true,
    },

    matchedAt: { type: Date, default: null },
    unmatchedAt: { type: Date, default: null },
    unmatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // If blocked
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    blockedAt: { type: Date, default: null },

    // AI Compatibility System
    aiCompatibility: {
      score: Number, // 0-100
      personalityFit: {
        description: String,
        tags: [String],
        score: Number,
      },
      interestsOverlap: {
        common: [String],
        score: Number,
      },
      valueAlignment: {
        alignedValues: [String],
        score: Number,
      },
      aiSummary: String, // short final summary for UI
      modelVersion: { type: String, default: "v1" },
    },

    // For future—progress of relationship
    interactionStats: {
      likesSent: { type: Number, default: 0 },
      messagesExchanged: { type: Number, default: 0 },
      firstMessageBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      firstMessageAt: { type: Date, default: null },
    },

    // Visibility
    isHiddenForA: { type: Boolean, default: false },
    isHiddenForB: { type: Boolean, default: false },

    // For recommendation engine
    isSuggestedMatch: { type: Boolean, default: false }, // AI recommended anomaly

    // Safety
    reportCount: { type: Number, default: 0 },
    isHighRisk: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// compound index to prevent duplicate matches
MatchSchema.index({ userA: 1, userB: 1 }, { unique: true });

export default mongoose.model("Match", MatchSchema);
