const express = require('express');
const path = require('path');
const router = express.Router();

// Define dashboard route
router.get('/', async (req, res) => {
  if (req.isAuthenticated()) {
    const filePath = path.join(__dirname, '../views/dashboard.html');
    res.sendFile(filePath);
  } else {
    res.redirect('/login');
  }
});

module.exports = router;
