const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name must be under 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      // Excluded from query results unless explicitly selected.
      select: false,
    },
    // Plain text extracted from the most recent resume upload.
    // Capped well below MongoDB's 16 MB per-document limit.
    resumeText: {
      type: String,
      default: "",
      maxlength: 200000,
    },
    // Canonical skill names detected in the resume.
    skills: {
      type: [String],
      default: [],
    },
    // Role the user is preparing for (e.g. "Frontend Developer" or a custom
    // role such as "Biotech Engineer").
    targetRole: {
      type: String,
      default: "",
      trim: true,
      maxlength: [80, "Target role must be under 80 characters"],
    },
    // Required skills for the target role. Presets use the curated profile;
    // custom roles use the AI-generated (or fallback) profile.
    targetRoleSkills: {
      type: [String],
      default: [],
    },
    // Where targetRoleSkills came from: predefined, ai, or fallback.
    targetRoleSkillsSource: {
      type: String,
      default: "",
      trim: true,
    },
    // Skills extracted from the most recent resume upload.
    resumeSkills: {
      type: [String],
      default: [],
    },
    // Most recent mock-interview scores (newest last, capped at 20).
    interviewScores: {
      type: [Number],
      default: [],
    },
  },
  { timestamps: true }
);

// Never serialize the hash, even if it was selected.
userSchema.set("toJSON", {
  versionKey: false,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.resumeText;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);