import mongoose from "mongoose";

const familyInviteSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true },
        inviterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        scope: [{ type: String }], // e.g., ['view_matches', 'view_profile', 'chat']
        expiresAt: { type: Date, required: true },
        status: {
            type: String,
            enum: ["active", "used", "expired"],
            default: "active",
        },
        // Track who used the code
        usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        usedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// Index for faster lookups and auto-expiry (optional, but good practice)
familyInviteSchema.index({ code: 1 });
familyInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired docs if desired, or just filter query

export default mongoose.model("FamilyInvite", familyInviteSchema);
