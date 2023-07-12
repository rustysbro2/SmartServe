const express = require("express");
const router = express.Router();
const passport = require("passport");

// Root route
router.get("/", (req, res) => {
  res.render("index"); // Assuming you have an "index.ejs" file in your views directory
});

// Login route
router.get("/login", passport.authenticate("discord"));

// Discord authentication callback route
router.get(
  "/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/dashboard");
  },
);

module.exports = router;
