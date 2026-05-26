const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailOtpHash: String,
    emailOtpExpires: Date,
    resetPasswordOtpHash: String,
    resetPasswordOtpExpires: Date,
    resume: {
      filename: String,
      originalName: String,
      feedback: String,
      atsScore: Number,
      strengths: [String],
      improvements: [String],
      extractedTextPreview: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
