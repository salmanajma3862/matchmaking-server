import mongoose from "mongoose";

const VerificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // CNIC information
    cnicNumber: { type: String, default: null },
    cnicFrontImageUrl: { type: String, default: null },
    cnicBackImageUrl: { type: String, default: null },

    // Selfie for face match
    selfieImageUrl: { type: String, default: null },

    // OCR extraction
    ocrData: {
      name: String,
      dob: String,
      fatherName: String,
      expiryDate: String,
      issueDate: String,
      confidence: Number,
    },

    // AI Face Match results
    aiFaceMatch: {
      matchScore: Number,
      isMatch: { type: Boolean, default: false },
      modelVersion: { type: String, default: "v1" },
    },

    // Manual verification (admin)
    manualReview: {
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
      reviewerNotes: { type: String, default: null },
    },

    // Final verification status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    rejectionReason: { type: String, default: null },

    // Audit log
    submittedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Verification", VerificationSchema);
