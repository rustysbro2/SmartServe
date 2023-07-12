const express = require("express");
const passport = require("passport");
const router = express.Router();

// Discord callback route
router.get("/", (req, res, next) => {
  passport.authenticate("discord", (err, user, info) => {
    if (err) {
      console.error("Error during authentication:", err);
      return next(err);
    }

    if (!user) {
      console.error("Authentication failed");
      return res.redirect("/login");
    }

    console.log("Authentication successful");
    req.logIn(user, (err) => {
      if (err) {
        console.error("Error during login:", err);
        return next(err);
      }
      return res.redirect("/profile");
    });
  })(req, res, next);
});

module.exports = router;
