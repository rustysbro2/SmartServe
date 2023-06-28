const { pool } = require('../database');
const { getGuilds } = require('./helpers/discord');

async function setupDatabase(accessToken) {
  try {
    // Create the servers table if it doesn't exist
    const createServersTableQuery = `CREATE TABLE IF NOT EXISTS servers (
      id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      PRIMARY KEY (id)
    )`;
    await pool.query(createServersTableQuery);

    console.log('Servers table created successfully.');

    // Fetch the Discord guilds for the authenticated user
    console.log('Access Token:', accessToken);
    const guilds = await getGuilds(accessToken);
    console.log('Guilds:', guilds);

    // Insert or update the Discord guilds in the servers table
    const insertOrUpdateServersQuery = 'INSERT INTO servers (id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)';
    for (const guild of guilds) {
      await pool.query(insertOrUpdateServersQuery, [guild.id, guild.name, guild.description]);
    }

    console.log('Discord guilds inserted/updated in the servers table.');
  } catch (error) {
    console.log('Error setting up the database:', error);
    throw new Error('Error setting up the database: ' + error.message);
  }
}

module.exports = {
  setupDatabase
};
