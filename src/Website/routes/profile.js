const express = require('express');
const router = express.Router();

// Define profile route
router.get('/', (req, res) => {
  // Assuming you have the user and email data available
  const user = req.user ? req.user.username : null;
  const email = req.user ? req.user.email : null;

  res.render('profile', { user, email });
});

module.exports = router;
