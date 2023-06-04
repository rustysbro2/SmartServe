const database = require('../database.js');

function initializeDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS strike_channels (
      guild_id VARCHAR(20) NOT NULL,
      channel_id VARCHAR(20) NOT NULL,
      PRIMARY KEY (guild_id)
    );
  `;
  database.query(createTableQuery)
    .then(() => {
      console.log('strike_channels table created');
    })
    .catch((error) => {
      console.error('Error creating strike_channels table:', error);
    });
}

async function setStrikeChannel(guildId, channelId) {
  const query = `
    INSERT INTO strike_channels (guild_id, channel_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE channel_id = ?;
  `;
  try {
    await database.query(query, [guildId, channelId, channelId]);
    console.log('Strike channel set successfully');
  } catch (error) {
    console.error('Error setting strike channel:', error);
  }
}

async function getStrikeChannel(guildId) {
  const query = `
    SELECT channel_id
    FROM strike_channels
    WHERE guild_id = ?;
  `;
  try {
    const [rows] = await database.query(query, [guildId]);
    if (rows.length > 0) {
      return rows[0].channel_id;
    }
    return null;
  } catch (error) {
    console.error('Error getting strike channel:', error);
    return null;
  }
}

module.exports = {
  initializeDatabase,
  setStrikeChannel,
  getStrikeChannel,
};
