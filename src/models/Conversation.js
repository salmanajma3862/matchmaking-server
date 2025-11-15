import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // one-to-one chat only
    isOneToOne: { type: Boolean, default: true },

    // last message metadata
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    lastMessageText: { type: String, default: "" },
    lastMessageAt: { type: Date, default: null },

    // unread counters: { userId: number }
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },

    // SafeChat Feature
    isSafeChatEnabled: { type: Boolean, default: true },
    messagesBlurredUntilMutualInterest: {
      type: Boolean,
      default: true,
    },

    // AI moderation flags
    aiModerationEnabled: { type: Boolean, default: true },
    toxicContentDetected: { type: Boolean, default: false },
    lastModerationCheck: { type: Date, default: null },

    // mute / block / archive
    isArchivedBy: {
      type: Map, // userId : true
      of: Boolean,
      default: {},
    },
    isMutedBy: {
      type: Map, // userId : true
      of: Boolean,
      default: {},
    },

    // For block system
    isBlocked: { type: Boolean, default: false },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // For building real-time UI (typing indicators)
    typingStatus: {
      type: Map, // userId : true/false
      of: Boolean,
      default: {},
    },

    // For read receipts
    readStatus: {
      type: Map, // userId : timestamp
      of: Date,
      default: {},
    },

    // Analytics
    totalMessages: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", ConversationSchema);
