const pool = require('../database');

async function addStrike(userId, reason) {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS strikes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        reason VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(createTableQuery);

    const insertQuery = 'INSERT INTO strikes (user_id, reason) VALUES (?, ?)';
    await pool.query(insertQuery, [userId, reason]);
    console.log(`Added strike for user with ID: ${userId}`);
  } catch (error) {
    console.error('Error adding strike:', error);
  }
}

module.exports = {
  addStrike,
};
