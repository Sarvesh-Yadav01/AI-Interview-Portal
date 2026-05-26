const InterviewResult = require("../models/InterviewResult");
const { generateRoundQuestions, evaluateRound, generateQualificationEmail } = require("../services/aiService");
const { generateInterviewReport } = require("../services/reportService");
const { sendCustomMail, sendViolationMail } = require("../services/emailService");
const { rounds, technicalCategories, technicalSubcategories } = require("../services/interviewConfig");

function cleanRound(value) {
  return rounds[value] ? value : "aptitude";
}


function cleanSubcategory(value) {
  return technicalSubcategories.includes(value) ? value : "MERN Stack Developer";
}

async function getProgress(userId) {
  const completed = await InterviewResult.find({ user: userId, status: { $ne: "terminated" } })
    .select("roundKey score role createdAt")
    .sort({ createdAt: 1 })
    .lean();

  const aptitudePassed = completed.some((item) => item.roundKey === "aptitude" && item.score >= 60);
  const technicalPassed = completed.some((item) => item.roundKey === "technical" && item.score >= 60);
  const voicePassed = completed.some((item) => item.roundKey === "voice" && item.score >= 60);
  const latestTechnical = completed.filter((item) => item.roundKey === "technical").slice(-1)[0];

  return {
    aptitude: true,
    technical: aptitudePassed,
    voice: technicalPassed,
    qualified: aptitudePassed && technicalPassed && voicePassed,
    subcategory: latestTechnical ? latestTechnical.role : ""
  };
}

async function getRecentQuestionTexts(userId, roundKey, role) {
  const query = {
    user: userId,
    roundKey,
    status: { $ne: "terminated" }
  };

  if (role) {
    query.role = role;
  }

  const attempts = await InterviewResult.find(query)
    .select("answers.question createdAt")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return attempts
    .flatMap((attempt) => attempt.answers || [])
    .map((answer) => answer.question)
    .filter(Boolean)
    .slice(0, 50);
}


exports.selectCategory = async (req, res) => {
  const progress = await getProgress(req.user._id);
  res.render("interview/select", {
    title: "Interview Rounds",
    rounds,
    progress,
    technicalCategories
  });
};

exports.start = async (req, res) => {
  const roundKey = cleanRound(req.body.round || req.query.round);
  const progress = await getProgress(req.user._id);

  if (!progress[roundKey]) {
    return res.redirect("/interview");
  }

  const subcategory = roundKey === "technical"
    ? cleanSubcategory(req.body.subcategory || req.query.subcategory)
    : "";
  const round = rounds[roundKey];
  const role = subcategory || round.title;
  const previousQuestions = await getRecentQuestionTexts(req.user._id, roundKey, role);
  const questions = await generateRoundQuestions({
    roundKey,
    subcategory,
    previousQuestions,
    candidateId: String(req.user._id)
  });

  req.session.interview = {
    roundKey,
    category: round.category,
    role,
    difficulty: "Medium",
    durationMinutes: round.durationMinutes,
    questions,
    startedAt: Date.now(),
    warnings: 0
  };

  res.render("interview/start", {
    title: round.title,
    round,
    roundKey,
    category: round.category,
    role,
    difficulty: "Medium",
    durationMinutes: round.durationMinutes,
    questions,
    voiceEnabled: roundKey === "voice"
  });
};

exports.submit = async (req, res) => {
  const interview = req.session.interview;

  if (!interview) {
    return res.redirect("/interview");
  }

  const submittedAnswers = interview.questions.map((question, index) => {
    const key = `answer_${index}`;
    return question.type === "mcq" ? req.body[key] || "" : req.body[key] || "";
  });

  const evaluation = await evaluateRound({
    round: interview.category,
    questions: interview.questions,
    submittedAnswers,
    subcategory: interview.role
  });
  const durationSeconds = Math.round((Date.now() - interview.startedAt) / 1000);

  const securityEvents = req.body.securityEvents ? String(req.body.securityEvents).slice(0, 2000).split("\n") : [];
  const voiceTranscript = String(req.body.voiceTranscript || "").slice(0, 4000);

  const result = await InterviewResult.create({
    user: req.user._id,
    roundKey: interview.roundKey,
    category: interview.category,
    role: interview.role,
    difficulty: interview.difficulty,
    score: evaluation.score,
    answers: evaluation.answers,
    summary: evaluation.summary,
    durationSeconds,
    status: "completed",
    securityEvents,
    voiceTranscript,
    proctoringSummary: {
      webcamEnabled: req.body.webcamEnabled === "true",
      screenShareEnabled: req.body.screenShareEnabled === "true",
      eventCount: securityEvents.filter(Boolean).length
    }
  });

  if (interview.roundKey === "voice" && evaluation.score >= 60) {
    const completed = await InterviewResult.find({
      user: req.user._id,
      status: "completed",
      roundKey: { $in: ["aptitude", "technical", "voice"] }
    })
      .sort({ createdAt: -1 })
      .lean();
    const hasAptitude = completed.some((item) => item.roundKey === "aptitude" && item.score >= 60);
    const technical = completed.find((item) => item.roundKey === "technical" && item.score >= 60);
    const hasVoice = completed.some((item) => item.roundKey === "voice" && item.score >= 60);

    if (hasAptitude && technical && hasVoice) {
      const text = await generateQualificationEmail({
        user: req.user,
        subcategory: technical.role,
        results: completed
      });
      await sendCustomMail({
        to: req.user.email,
        subject: "Congratulations for qualifying the exam",
        text
      });
    }
  }

  req.session.interview = null;
  res.redirect(`/interview/result/${result._id}`);
};

exports.terminate = async (req, res) => {
  const interview = req.session.interview;
  const reason = String(req.body.reason || "Security policy violation").slice(0, 300);

  if (!interview) {
    return res.json({ ok: true, redirect: "/interview" });
  }

  const result = await InterviewResult.create({
    user: req.user._id,
    roundKey: interview.roundKey,
    category: interview.category,
    role: interview.role,
    difficulty: interview.difficulty,
    score: 0,
    answers: [],
    summary: `Exam ended automatically. Reason: ${reason}`,
    durationSeconds: Math.round((Date.now() - interview.startedAt) / 1000),
    status: "terminated",
    terminationReason: reason,
    securityEvents: [reason]
  });

  await sendViolationMail(req.user, reason);
  req.session.interview = null;

  res.json({ ok: true, redirect: `/interview/result/${result._id}` });
};

exports.result = async (req, res) => {
  const result = await InterviewResult.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!result) {
    return res.redirect("/dashboard");
  }

  const progress = await getProgress(req.user._id);
  res.render("interview/result", { title: "Interview Result", result, rounds, progress, adminView: false });
};

exports.downloadReport = async (req, res) => {
  const result = await InterviewResult.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!result) {
    return res.redirect("/dashboard");
  }

  generateInterviewReport(result, req.user, res);
};
