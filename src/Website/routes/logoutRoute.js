// logoutRoute.js

const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  req.logout(() => {
    // Clear the user session
    req.session.destroy(() => {
      // Redirect the user to the home page or any other desired page
      res.redirect("/");
    });
  });
});

module.exports = router;
