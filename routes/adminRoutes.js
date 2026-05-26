const express = require("express");
const adminController = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/login", adminController.loginForm);
router.post("/login", adminController.login);
router.post("/logout", adminController.logout);
router.get("/", requireAdmin, adminController.index);
router.get("/result/:id", requireAdmin, adminController.viewResult);
router.post("/result/:id/delete", requireAdmin, adminController.deleteResult);
router.post("/result/:id/mail", requireAdmin, adminController.mailCandidate);

module.exports = router;
