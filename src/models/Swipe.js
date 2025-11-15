import mongoose from "mongoose";

const SwipeSchema = new mongoose.Schema(
  {
    swiper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    action: {
      type: String,
      enum: ["like", "dislike", "superlike"],
      required: true,
    },

    // To prevent repeated swipes
    uniqueSwipeId: {
      type: String,
      unique: true, // `${swiper}_${target}`
    },

    // AI / UX metadata
    aiCompatibilityScore: { type: Number, default: null }, // stored before match
    reasonForSwipe: { type: String, default: null }, // future use (optional user remark)

    // Geolocation (optional)
    locationAtSwipe: {
      lat: Number,
      lng: Number,
    },

    // Useful for analytics
    source: {
      type: String,
      enum: ["home", "suggested", "boost", "search", "rewind"],
      default: "home",
    },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// compound index for fast lookup
SwipeSchema.index({ swiper: 1, target: 1 }, { unique: true });

export default mongoose.model("Swipe", SwipeSchema);
