const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function attachUser(req, res, next) {
  const token = req.cookies.token;
  res.locals.currentUser = null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    req.user = user || null;
    res.locals.currentUser = req.user;
  } catch (error) {
    res.clearCookie("token");
  }

  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.redirect("/auth/login");
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.adminAuthenticated) {
    return res.redirect("/admin/login");
  }

  next();
}

module.exports = { attachUser, requireAuth, requireAdmin };
