const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    question: String,
    type: {
      type: String,
      enum: ["mcq", "written", "coding"],
      default: "written"
    },
    topic: String,
    difficulty: String,
    options: [String],
    correctAnswer: String,
    answer: String,
    feedback: String,
    score: Number,
    tips: [String]
  },
  { _id: false }
);

const interviewResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    roundKey: {
      type: String,
      enum: ["aptitude", "technical", "aiQuestions", "voice", "coding", "legacy"],
      default: "legacy"
    },


    category: {

      type: String,
      required: true
    },
    role: {
      type: String,
      default: "General Candidate"
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium"
    },
    score: {
      type: Number,
      default: 0
    },
    answers: [answerSchema],
    summary: String,
    durationSeconds: Number,
    status: {
      type: String,
      enum: ["completed", "terminated"],
      default: "completed"
    },
    terminationReason: String,
    securityEvents: [String],
    voiceTranscript: String,
    proctoringSummary: {
      webcamEnabled: {
        type: Boolean,
        default: false
      },
      screenShareEnabled: {
        type: Boolean,
        default: false
      },
      eventCount: {
        type: Number,
        default: 0
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewResult", interviewResultSchema);
