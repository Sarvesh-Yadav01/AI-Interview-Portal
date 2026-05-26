const User = require("../models/User");
const InterviewResult = require("../models/InterviewResult");
const { sendCustomMail } = require("../services/emailService");

const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const ADMIN_PASS = String(process.env.ADMIN_PASS || "");

exports.loginForm = (req, res) => {
  if (req.session.adminAuthenticated) {
    return res.redirect("/admin");
  }

  res.render("admin/login", {
    title: "Admin Sign In",
    error: null
  });
};

exports.login = (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (ADMIN_EMAIL && ADMIN_PASS && email === ADMIN_EMAIL && password === ADMIN_PASS) {
    req.session.adminAuthenticated = true;
    return res.redirect("/admin");
  }

  res.status(401).render("admin/login", {
    title: "Admin Sign In",
    error: "Invalid admin email or password."
  });
};

exports.logout = (req, res) => {
  req.session.adminAuthenticated = false;
  res.redirect("/admin/login");
};

exports.index = async (req, res) => {
  const [results, totalUsers, completed, terminated] = await Promise.all([
    InterviewResult.find().populate("user", "name email").sort({ createdAt: -1 }).limit(25).lean(),
    User.countDocuments(),
    InterviewResult.countDocuments({ status: "completed" }),
    InterviewResult.countDocuments({ status: "terminated" })
  ]);

  const averageScore = results.length
    ? Math.round(results.reduce((sum, item) => sum + Number(item.score || 0), 0) / results.length)
    : 0;

  const roundCounts = results.reduce((acc, item) => {
    acc[item.roundKey] = (acc[item.roundKey] || 0) + 1;
    return acc;
  }, {});

  res.render("admin/index", {
    title: "Admin Dashboard",
    results,
    stats: {
      totalUsers,
      completed,
      terminated,
      averageScore
    },
    roundCounts
  });
};

exports.deleteResult = async (req, res) => {
  await InterviewResult.findByIdAndDelete(req.params.id);
  res.redirect("/admin");
};

exports.viewResult = async (req, res) => {
  const result = await InterviewResult.findById(req.params.id).populate("user", "name email").lean();

  if (!result) {
    return res.redirect("/admin");
  }

  res.render("interview/result", {
    title: "Interview Result",
    result,
    rounds: {},
    progress: {},
    adminView: true
  });
};

exports.mailCandidate = async (req, res) => {
  const result = await InterviewResult.findById(req.params.id).populate("user", "name email").lean();

  if (result && result.user) {
    await sendCustomMail({
      to: result.user.email,
      subject: "Interview performance report",
      text: `Dear ${result.user.name},\n\nYour ${result.category} report is available. Score: ${result.score}%.\n\nSummary: ${result.summary || "Report generated successfully."}\n\nRegards,\nAI Interview Portal`
    });
  }

  res.redirect("/admin");
};
