const express = require('express');
const passport = require('passport');
const router = express.Router();

// Define callback route
router.get('/', passport.authenticate('discord', {
  failureRedirect: '/login',
}), (req, res) => {
  res.redirect('/profile');
});

module.exports = router;
