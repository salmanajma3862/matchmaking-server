import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------------------
    // BASIC PROFILE
    // ------------------------------------------------------------------
    name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    dob: { type: Date, required: true },
    bio: { type: String, default: "" },
    height: Number,
    weight: Number,
    bodyType: { type: String },
    city: String,
    country: String,
    address: String,
    religion: String,
    sect: String,
    maritalStatus: {
      type: String,
      enum: ["Single", "Divorced", "Widowed", "Separated"],
      default: "Single",
    },
    education: String,
    profession: String,
    incomeRange: String,

    // Profile photos & voice intro
    photos: [
      {
        url: { type: String },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    voiceIntroUrl: { type: String, default: null },

    // Hobbies & Interests
    interests: [String],
    hobbies: [String],

    // Life habits
    smoking: { type: Boolean, default: false },
    drinking: { type: Boolean, default: false },
    dietPreference: { type: String },

    // Family details
    familyBackground: String,
    numberOfSiblings: Number,
    livingWithFamily: { type: Boolean, default: false },

    // ------------------------------------------------------------------
    // AUTH & ACCOUNT
    // ------------------------------------------------------------------
    phone: { type: String, required: true, unique: true },
    email: { type: String, unique: true, sparse: true },
    passwordHash: { type: String, required: true },

    // Email verification
    isEmailVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null },
    verificationCodeExpiry: { type: Date, default: null },

    // Password reset
    passwordResetToken: { type: String, default: null },
    passwordResetExpiry: { type: Date, default: null },

    // Login tracking
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
    lastLoginLocation: { type: String, default: null },

    isDeleted: { type: Boolean, default: false },

    // ------------------------------------------------------------------
    // REALTIME PRESENCE / DEVICE
    // ------------------------------------------------------------------
    isOnline: { type: Boolean, default: false },
    lastSeen: Date,
    deviceType: String,
    pushToken: String,
    socketId: String,

    typingStatus: {
      conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
      isTyping: { type: Boolean, default: false },
    },

    // ------------------------------------------------------------------
    // USER INTENTION (Dating + Rishta angle)
    // ------------------------------------------------------------------
    intention: {
      type: String,
      enum: ["marriage", "friendship", "dating", "not_sure"],
      default: "marriage",
    },
    priorityLevel: { type: Number, min: 1, max: 5, default: 3 },
    readyForMarriageTimeframe: {
      type: String,
      enum: ["soon", "6_months", "1_year", "not_sure"],
      default: "not_sure",
    },

    // ------------------------------------------------------------------
    // PREFERENCES (for AI matchmaking filters)
    // ------------------------------------------------------------------
    preferences: {
      minAge: Number,
      maxAge: Number,
      city: [String],
      gender: { type: String, enum: ["male", "female", "both"] },
      maritalStatus: [String],
      religion: [String],
      education: [String],
      searchRadiusKm: Number,
    },

    // ------------------------------------------------------------------
    // PERSONALITY + AI MATCHMAKING
    // ------------------------------------------------------------------
    personality: {
      openness: Number,
      agreeableness: Number,
      extraversion: Number,
      neuroticism: Number,
      conscientiousness: Number,
    },
    aiGeneratedTags: [String],
    aiPersonalityLabel: String,
    aiLastMatchExplanation: String,
    aiProfileInsights: String,

    // AI Quality Metrics
    attractivenessScore: Number,
    profileCompleteness: Number,
    matchScoreHistory: [Number],
    aiCompatibilityRating: Number,
    matchSuccessRate: Number,

    // ------------------------------------------------------------------
    // MATCHES / SWIPES
    // ------------------------------------------------------------------
    liked: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    disliked: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    matches: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        matchedAt: Date,
        compatibilityScore: Number,
      },
    ],

    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ------------------------------------------------------------------
    // CONVERSATIONS / CHAT ANALYTICS
    // ------------------------------------------------------------------
    conversations: [
      {
        conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
        lastMessageAt: Date,
      },
    ],

    totalMessagesSent: { type: Number, default: 0 },
    totalMessagesReceived: { type: Number, default: 0 },
    totalConversations: { type: Number, default: 0 },
    totalMatches: { type: Number, default: 0 },
    profileViews: { type: Number, default: 0 },
    averageResponseTime: Number,
    lastMessageSentAt: Date,
    lastMessageReceivedAt: Date,

    // ------------------------------------------------------------------
    // SAFECHAT MODE / MODERATION
    // ------------------------------------------------------------------
    moderation: {
      toxicCount: { type: Number, default: 0 },
      lastWarningAt: Date,
      autoBlurEnabled: { type: Boolean, default: true },
      safetyScore: { type: Number, default: 100 },
      reportsMade: { type: Number, default: 0 },
      reportsReceived: { type: Number, default: 0 },
      shadowBanStatus: { type: Boolean, default: false },
      moderationNotes: String,
    },

    // ------------------------------------------------------------------
    // FAMILY MODE
    // ------------------------------------------------------------------
    familyMode: {
      enabled: { type: Boolean, default: false },
      parents: [
        {
          name: String,
          relation: { type: String, enum: ["father", "mother", "guardian"] },
          phone: String,
          canViewMatches: { type: Boolean, default: true },
        },
      ],
    },

    // ------------------------------------------------------------------
    // GEO / LOCATION
    // ------------------------------------------------------------------
    currentLocation: {
      lat: Number,
      lng: Number,
      lastUpdated: Date,
    },

    // ------------------------------------------------------------------
    // SUBSCRIPTIONS / BOOSTS / MONETIZATION
    // ------------------------------------------------------------------
    subscription: {
      plan: { type: String, enum: ["free", "premium", "gold"], default: "free" },
      expiresAt: Date,
    },

    boosts: {
      profileBoosts: { type: Number, default: 0 },
      usedAt: [Date],
    },

    totalSpend: { type: Number, default: 0 },
    lastPurchaseAt: Date,
    adsWatched: { type: Number, default: 0 },
    rewardCredits: { type: Number, default: 0 },
    referralCode: String,
    referredUsers: { type: Number, default: 0 },

    // ------------------------------------------------------------------
    // PRIVACY CONTROLS
    // ------------------------------------------------------------------
    privacySettings: {
      hideLastSeen: { type: Boolean, default: false },
      hideProfilePhoto: { type: Boolean, default: false },
      hideOnlineStatus: { type: Boolean, default: false },
      blockStrangersFromMessaging: { type: Boolean, default: false },
    },

    // ------------------------------------------------------------------
    // NOTIFICATIONS
    // ------------------------------------------------------------------
    notificationsEnabled: { type: Boolean, default: true },
    messageNotifications: { type: Boolean, default: true },
    matchNotifications: { type: Boolean, default: true },
    familyApprovalNotifications: { type: Boolean, default: true },
    marketingNotifications: { type: Boolean, default: false },

    // ------------------------------------------------------------------
    // VERIFICATION SYSTEM
    // ------------------------------------------------------------------
    isVerified: { type: Boolean, default: false },

    cnicVerification: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", "none"],
        default: "none",
      },
      cnicNumber: String,
      frontImage: String,
      backImage: String,
      verifiedAt: Date,
    },

    // ------------------------------------------------------------------
    // SECURITY / SESSIONS / ABUSE PREVENTION
    // ------------------------------------------------------------------
    loginAttempts: { type: Number, default: 0 },
    failedOtpAttempts: { type: Number, default: 0 },
    accountLockedUntil: Date,
    vpnDetected: Boolean,
    multipleDeviceLoginFlag: Boolean,
    spamScore: { type: Number, default: 0 },

    currentSessionId: String,
    lastSessionId: String,
    sessionHistory: [
      {
        device: String,
        location: String,
        time: Date,
      },
    ],

    // ------------------------------------------------------------------
    // ONBOARDING
    // ------------------------------------------------------------------
    onboardingCompleted: { type: Boolean, default: false },
    onboardingStep: { type: Number, default: 1 },
    hasSeenIntroScreens: { type: Boolean, default: true },
    needsProfileUpdate: { type: Boolean, default: false },

    // ------------------------------------------------------------------
    // ENGAGEMENT BOOST (ranking in matchmaking)
    // ------------------------------------------------------------------
    dailyBoostScore: { type: Number, default: 0 },
    weeklyBoostScore: { type: Number, default: 0 },
    manualBoostAppliedAt: Date,
    systemBoostLevel: { type: Number, default: 0 },

    // ------------------------------------------------------------------
    // META
    // ------------------------------------------------------------------
    isOnline: { type: Boolean, default: false },
    lastActive: Date,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);