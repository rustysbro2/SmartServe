const express = require('express');
const router = express.Router();
const { pool } = require('../../database');

// Define the route handler for the server details route
router.get('/:id', async (req, res) => {
  const serverId = req.params.id;

  try {
    const query = 'SELECT * FROM servers WHERE id = ?';
    const [server] = await pool.query(query, [serverId]);

    if (server) {
      res.render('server-details', { server });
    } else {
      res.status(404).send('Server not found');
    }
  } catch (error) {
    console.error('Error retrieving server details:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
