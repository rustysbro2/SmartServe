const express = require('express');
const passport = require('passport');
const router = express.Router();

// Login route
router.get('/', (req, res, next) => {
  console.log('Login route - User:', req.user);
  console.log('Login route - isAuthenticated:', req.isAuthenticated());
  passport.authenticate('discord')(req, res, next);
}, (req, res) => {
  console.log('Login route - Redirecting to /callback');
  res.redirect('/callback');
});

// Discord callback route
router.get('/callback', (req, res, next) => {
  console.log('Callback route - User:', req.user);
  console.log('Callback route - isAuthenticated:', req.isAuthenticated());
  passport.authenticate('discord')(req, res, next);
}, (req, res) => {
  console.log('Callback route - Redirecting to /dashboard');
  res.redirect('/dashboard');
});

module.exports = router;
