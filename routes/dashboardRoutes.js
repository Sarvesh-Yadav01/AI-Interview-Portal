const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, dashboardController.index);
router.get("/profile", requireAuth, dashboardController.profile);

module.exports = router;
