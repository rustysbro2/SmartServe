const express = require('express');
const path = require('path');
const router = express.Router();

// Define root route
router.get('/', (req, res) => {
  const pageTitle = 'My Website';
  const currentYear = new Date().getFullYear();
  res.render('index', { pageTitle, currentYear });
});

module.exports = router;
