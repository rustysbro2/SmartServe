const express = require('express');
const router = express.Router();

// Define dashboard route
router.get('/', async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      // Fetch user data based on the authenticated user
      const user = req.user.username;
      const email = req.user.email;
      const avatarURL = req.user.avatarURL;

      // Render the dashboard view with the user data
      res.render('dashboard', { user, email, avatarURL });
    } catch (error) {
      // Handle any errors that occur during data retrieval
      res.status(500).send('Error fetching user data');
    }
  } else {
    res.redirect('/login');
  }
});

module.exports = router;
