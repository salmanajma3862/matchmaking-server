import mongoose from "mongoose";

const FamilySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Temporary invite code system
    inviteCode: {
      code: { type: String, default: null }, // random "AB42DF"
      expiresAt: { type: Date, default: null },
      createdAt: { type: Date, default: null },
      isActive: { type: Boolean, default: false },
    },

    // List of family members who joined
    members: [
      {
        _id: false,

        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          auto: true,
        },

        name: { type: String, required: true },
        relation: {
          type: String,
          enum: ["father", "mother", "brother", "sister", "guardian", "other"],
          default: "guardian",
        },

        // Login or access token for family member
        access: {
          accessToken: { type: String, default: null },
          accessExpiresAt: { type: Date, default: null },
          lastLogin: { type: Date, default: null },
        },

        joinedAt: { type: Date, default: Date.now },

        // PERMISSIONS (set by owner)
        permissions: {
          canSeeProfile: { type: Boolean, default: true },
          canSeeMatches: { type: Boolean, default: true },
          canSeeSwipes: { type: Boolean, default: false },
          canSeeMessages: { type: Boolean, default: false },
          canReplyToMessages: { type: Boolean, default: false },
          canApproveMatches: { type: Boolean, default: true },
        },

        // If family member reads messages
        // You will show a transparency notice on the other user's chat screen
        chatTransparencyNoticeShownTo: {
          type: Map,        // otherUserId : true
          of: Boolean,
          default: {},
        },

        // Match approvals
        approvals: [
          {
            matchId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Match",
            },
            approved: { type: Boolean, default: false },
            approvedAt: { type: Date, default: null },
          },
        ],

        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Whether user activated family mode
    isFamilyModeActive: { type: Boolean, default: false },

    // If approvals required before chat is allowed
    approvalRequiredBeforeChat: { type: Boolean, default: false },

    // Analytics
    totalFamilyMembers: { type: Number, default: 0 },
    totalApprovalsGiven: { type: Number, default: 0 },
    totalRejectionsGiven: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Family", FamilySchema);
