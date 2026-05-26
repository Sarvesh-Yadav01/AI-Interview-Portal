const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isProduction } = require("../config/env");
const { sendOtpMail, sendPasswordResetOtpMail } = require("../services/emailService");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function setEmailOtp(user) {
  const otp = generateOtp();
  user.emailOtpHash = await bcrypt.hash(otp, 10);
  user.emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  const delivery = await sendOtpMail(user, otp);
  return delivery.sent ? null : otp;
}

async function setPasswordResetOtp(user) {
  const otp = generateOtp();
  user.resetPasswordOtpHash = await bcrypt.hash(otp, 10);
  user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  const delivery = await sendPasswordResetOtpMail(user, otp);
  return delivery.sent ? null : otp;
}

function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

exports.showRegister = (req, res) => {
  res.render("auth/register", { title: "Register", error: null });
};

exports.register = async (req, res) => {
  const name = normalizeName(req.body.name);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!name || !email || password.length < 8) {
    return res.render("auth/register", {
      title: "Register",
      error: "Enter a valid name, email, and password with at least 8 characters."
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      existingUser.name = name || existingUser.name;
      existingUser.password = await bcrypt.hash(password, 12);
      existingUser.isEmailVerified = false;
      const devOtp = await setEmailOtp(existingUser);
      if (devOtp) req.session.devEmailOtp = devOtp;
      return res.redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashedPassword, isEmailVerified: false });
    const devOtp = await setEmailOtp(user);
    if (devOtp) req.session.devEmailOtp = devOtp;

    res.redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error("Register error:", error.message);
    res.render("auth/register", {
      title: "Register",
      error: isProduction()
        ? "Unable to create account. Please try again."
        : `Unable to create account: ${error.message}`
    });
  }
};

exports.showVerifyOtp = (req, res) => {
  const devOtp = req.session.devEmailOtp;
  res.render("auth/verify-otp", {
    title: "Verify OTP",
    email: normalizeEmail(req.query.email),
    message: devOtp ? `SMTP is not configured with a real Gmail App Password. Development OTP: ${devOtp}` : null,
    error: null
  });
};

exports.verifyOtp = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || "").trim();

  const user = await User.findOne({ email });
  const isValid =
    user &&
    user.emailOtpHash &&
    user.emailOtpExpires &&
    user.emailOtpExpires > new Date() &&
    (await bcrypt.compare(otp, user.emailOtpHash));

  if (!isValid) {
    return res.render("auth/verify-otp", {
      title: "Verify OTP",
      email,
      message: null,
      error: "Invalid or expired OTP."
    });
  }

  user.isEmailVerified = true;
  user.emailOtpHash = undefined;
  user.emailOtpExpires = undefined;
  await user.save();
  req.session.devEmailOtp = null;

  res.cookie("token", createToken(user._id), authCookieOptions());
  res.redirect("/interview");
};

exports.resendOtp = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const user = await User.findOne({ email });

  if (user && !user.isEmailVerified) {
    const devOtp = await setEmailOtp(user);
    if (devOtp) req.session.devEmailOtp = devOtp;
  }

  res.render("auth/verify-otp", {
    title: "Verify OTP",
    email,
    message: req.session.devEmailOtp
      ? `SMTP is not configured with a real Gmail App Password. Development OTP: ${req.session.devEmailOtp}`
      : "If this email is registered, a new OTP has been sent.",
    error: null
  });
};

exports.showLogin = (req, res) => {
  res.render("auth/login", { title: "Login", error: null, message: null });
};

exports.login = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  try {
    const user = await User.findOne({ email });
    if (user && !user.password) {
      return res.render("auth/login", {
        title: "Login",
        message: null,
        error: "This account needs a password reset before login."
      });
    }

    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!isMatch) {
      return res.render("auth/login", {
        title: "Login",
        message: null,
        error: "Invalid email or password."
      });
    }

    if (!user.isEmailVerified) {
      const devOtp = await setEmailOtp(user);
      if (devOtp) req.session.devEmailOtp = devOtp;
      return res.redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
    }

    const token = createToken(user._id);
    res.cookie("token", token, authCookieOptions());
    res.redirect("/interview");
  } catch (error) {
    console.error("Login error:", error.message);
    res.render("auth/login", {
      title: "Login",
      message: null,
      error: isProduction() ? "Login failed. Please try again." : `Login failed: ${error.message}`
    });
  }
};

exports.showForgotPassword = (req, res) => {
  res.render("auth/forgot-password", { title: "Forgot Password", message: null, error: null });
};

exports.forgotPassword = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const user = await User.findOne({ email });

  if (user) {
    const devOtp = await setPasswordResetOtp(user);
    if (devOtp) req.session.devResetOtp = devOtp;
  }

  res.render("auth/reset-password", {
    title: "Reset Password",
    email,
    message: req.session.devResetOtp
      ? `SMTP is not configured with a real Gmail App Password. Development reset OTP: ${req.session.devResetOtp}`
      : "If this email is registered, a password reset OTP has been sent.",
    error: null
  });
};

exports.showResetPassword = (req, res) => {
  const devOtp = req.session.devResetOtp;
  res.render("auth/reset-password", {
    title: "Reset Password",
    email: normalizeEmail(req.query.email),
    message: devOtp ? `SMTP is not configured with a real Gmail App Password. Development reset OTP: ${devOtp}` : null,
    error: null
  });
};

exports.resetPassword = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || "").trim();
  const password = String(req.body.password || "");
  const user = await User.findOne({ email });

  const isValid =
    user &&
    user.resetPasswordOtpHash &&
    user.resetPasswordOtpExpires &&
    user.resetPasswordOtpExpires > new Date() &&
    (await bcrypt.compare(otp, user.resetPasswordOtpHash));

  if (!isValid || password.length < 8) {
    return res.render("auth/reset-password", {
      title: "Reset Password",
      email,
      message: null,
      error: "Enter a valid OTP and a new password with at least 8 characters."
    });
  }

  user.password = await bcrypt.hash(password, 12);
  user.resetPasswordOtpHash = undefined;
  user.resetPasswordOtpExpires = undefined;
  user.isEmailVerified = true;
  await user.save();
  req.session.devResetOtp = null;

  res.render("auth/login", {
    title: "Login",
    error: null,
    message: "Password updated. Please login with your new password."
  });
};

exports.logout = (req, res) => {
  res.clearCookie("token", authCookieOptions());
  res.redirect("/");
};
