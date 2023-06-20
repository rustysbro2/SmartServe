const express = require('express');
const router = express.Router();

// Logout Route
router.get('/', (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.error('Error occurred during logout:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;
