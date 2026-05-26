const express = require("express");
const interviewController = require("../controllers/interviewController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, interviewController.selectCategory);
router.post("/start", requireAuth, interviewController.start);
router.post("/submit", requireAuth, interviewController.submit);
router.post("/terminate", requireAuth, interviewController.terminate);
router.get("/result/:id", requireAuth, interviewController.result);
router.get("/result/:id/report", requireAuth, interviewController.downloadReport);

module.exports = router;
