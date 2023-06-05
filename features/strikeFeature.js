const { EmbedBuilder } = require('discord.js');
const pool = require('../database');

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

async function logStrike(guildId, userId, reason) {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS strikes (
        guild_id VARCHAR(20) NOT NULL,
        user_id VARCHAR(20) NOT NULL,
        reason VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (guild_id, user_id, timestamp)
      )
    `;
    await pool.query(query);

    const insertQuery = `
      INSERT INTO strikes (guild_id, user_id, reason)
      VALUES (?, ?, ?)
    `;
    await pool.query(insertQuery, [guildId, userId, reason]);

    console.log('Strike logged successfully.');
  } catch (error) {
    console.error('Error logging strike:', error);
  }
}

async function getStrikes(guildId, userId) {
  try {
    const query = `
      SELECT COUNT(*) AS count
      FROM strikes
      WHERE guild_id = ? AND user_id = ?
    `;
    const [rows] = await pool.query(query, [guildId, userId]);

    return rows[0].count;
  } catch (error) {
    console.error('Error retrieving strikes:', error);
    return 0;
  }
}

async function buildStrikeLogEmbed(guildId) {
  try {
    const query = `
      SELECT user_id, COUNT(*) AS count
      FROM strikes
      WHERE guild_id = ?
      GROUP BY user_id
    `;
    const [rows] = await pool.query(query, [guildId]);

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Strike Log')
      .setDescription('Here is the strike log for this guild:')
      .setTimestamp();

    if (rows.length === 0) {
      embed.addFields({ name: 'No strikes found', value: 'No users have been struck yet.' });
    } else {
      rows.forEach((row) => {
        const { user_id, count } = row;
        embed.addFields({ name: `User: ${user_id}`, value: `Strikes: ${count}`, inline: true });
      });
    }

    return embed.build();
  } catch (error) {
    console.error('Error building strike log embed:', error);
    return null;
  }
}

module.exports = {
  setStrikeChannel,
  logStrike,
  getStrikes,
  buildStrikeLogEmbed,
};
