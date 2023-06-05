const { EmbedBuilder } = require('discord.js');
const pool = require('../database.js');

async function setStrikeChannel(guildId, channelId) {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS strike_channels (
        guild_id VARCHAR(20) NOT NULL,
        channel_id VARCHAR(20) NOT NULL,
        PRIMARY KEY (guild_id)
      )
    `;
    await pool.query(query);

    const insertQuery = `
      INSERT INTO strike_channels (guild_id, channel_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE channel_id = ?
    `;
    await pool.query(insertQuery, [guildId, channelId, channelId]);

    console.log('Strike channel has been set successfully.');
  } catch (error) {
    console.error('Error setting strike channel:', error);
  }
}

Rows: { strike_reasons: ', e, t' }
Error logging strike: TypeError: Cannot read properties of undefined (reading 'strike_reasons')
    at logStrike (/root/SmartServe/features/strikeFeature.js:58:39)
    at processTicksAndRejections (node:internal/process/task_queues:96:5)
    at async Object.execute (/root/SmartServe/commands/strike.js:27:7)
    at async Client.<anonymous> (/root/SmartServe/bot.js:111:9)
^C


async function getStrikes(guildId, userId) {
  try {
    const query = `
      SELECT COUNT(*) AS count
      FROM strikes
      WHERE guild_id = ? AND user_id = ?
    `;
    const [rows] = await pool.query(query, [guildId, userId]);

    if (rows.length === 0) {
      return 0;
    }

    return rows[0].count;
  } catch (error) {
    console.error('Error retrieving strikes:', error);
    return 0;
  }
}

async function getStrikeData(guildId) {
  try {
    const query = `
      SELECT user_id, COUNT(*) AS count
      FROM strikes
      WHERE guild_id = ?
      GROUP BY user_id
    `;
    const [rows] = await pool.query(query, [guildId]);

    return rows;
  } catch (error) {
    console.error('Error retrieving strike data:', error);
    return [];
  }
}

module.exports = {
  setStrikeChannel,
  logStrike,
  getStrikes,
  getStrikeData,
};
