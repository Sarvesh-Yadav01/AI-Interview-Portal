const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  if (req.user) {
    return res.redirect("/interview");
  }

  res.render("home", { title: "AI Interview Portal" });
});

module.exports = router;
