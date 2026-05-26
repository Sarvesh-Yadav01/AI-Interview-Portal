const InterviewResult = require("../models/InterviewResult");

exports.index = async (req, res) => {
  return res.redirect("/interview");
  const results = await InterviewResult.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10);

  const totalInterviews = await InterviewResult.countDocuments({ user: req.user._id });
  const averageScore =
    results.length === 0
      ? 0
      : Math.round(results.reduce((sum, item) => sum + item.score, 0) / results.length);

  const chartLabels = results
    .slice()
    .reverse()
    .map((result) => result.createdAt.toLocaleDateString());
  const chartScores = results
    .slice()
    .reverse()
    .map((result) => result.score);

  res.render("dashboard/index", {
    title: "Dashboard",
    results,
    stats: {
      totalInterviews,
      averageScore,
      bestScore: results.length ? Math.max(...results.map((item) => item.score)) : 0
    },
    chartLabels,
    chartScores
  });
};

exports.profile = async (req, res) => {
  res.redirect("/interview");
};
