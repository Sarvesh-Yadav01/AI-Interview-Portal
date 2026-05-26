const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many attempts. Please try again after 15 minutes."
});

router.get("/register", authController.showRegister);
router.post("/register", authLimiter, authController.register);
router.get("/verify-otp", authController.showVerifyOtp);
router.post("/verify-otp", authLimiter, authController.verifyOtp);
router.post("/resend-otp", authLimiter, authController.resendOtp);
router.get("/login", authController.showLogin);
router.post("/login", authLimiter, authController.login);
router.get("/forgot-password", authController.showForgotPassword);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.get("/reset-password", authController.showResetPassword);
router.post("/reset-password", authLimiter, authController.resetPassword);
router.get("/logout", authController.logout);

module.exports = router;
