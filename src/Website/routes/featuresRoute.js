const express = require('express')
const router = express.Router()

// Define the features route
router.get('/', (req, res) => {
  res.render('features')
})

module.exports = router
