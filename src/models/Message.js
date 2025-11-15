import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Text / Media
    text: { type: String, default: "" },

    media: {
      imageUrl: { type: String, default: null },
      audioUrl: { type: String, default: null },
      videoUrl: { type: String, default: null },
      fileUrl: { type: String, default: null },
    },

    messageType: {
      type: String,
      enum: ["text", "image", "audio", "video", "file", "voice_note"],
      default: "text",
    },

    // For voice notes duration etc.
    metadata: {
      duration: Number,
      fileSize: Number,
      waveform: [Number], // for audio visualization
    },

    // SafeChat & AI moderation 
    blurred: { type: Boolean, default: false },
    aiModeration: {
      isToxic: { type: Boolean, default: false },
      severity: { type: String, default: null }, // low/medium/high
      moderationReason: { type: String, default: null },
      moderationModelVersion: { type: String, default: "v1" },
    },

    // delivery & read receipts
    deliveredTo: {
      type: Map, // userId : timestamp
      of: Date,
      default: {},
    },
    readBy: {
      type: Map, // userId : timestamp
      of: Date,
      default: {},
    },

    // If edited message
    edited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },

    // If deleted message
    deletedFor: {
      type: Map, // userId : true
      of: Boolean,
      default: {},
    },
    isDeletedForEveryone: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    // Message reactions: { userId : ["❤️","😂","👍",...] }
    reactions: {
      type: Map,
      of: [String],
      default: {},
    },

    // For AI-generated reply suggestions later
    aiGenerated: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Message", MessageSchema);