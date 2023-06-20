const express = require('express');
const passport = require('passport');
const router = express.Router();

// Define login route
router.get('/', passport.authenticate('discord'));

module.exports = router;
