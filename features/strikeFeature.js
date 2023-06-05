const { EmbedBuilder } = require('discord.js');
const pool = require('../database');
const client = require('../bot'); // Assuming you have a separate file where the Discord client is instantiated and exported

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
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        strike_reasons TEXT,
        PRIMARY KEY (guild_id, user_id, timestamp)
      )
    `;
    await pool.query(query);

    const selectQuery = `
      SELECT strike_reasons
      FROM strikes
      WHERE guild_id = ? AND user_id = ?
    `;
    const [rows] = await pool.query(selectQuery, [guildId, userId]);

    console.log('Rows:', rows);

    const existingReasons = rows[0]?.strike_reasons || ''; // Use optional chaining and fallback to an empty string if rows[0] or strike_reasons is undefined

    if (!existingReasons) {
      console.log('No existing strikes found for the user.');
      const insertQuery = `
        INSERT INTO strikes (guild_id, user_id, strike_reasons)
        VALUES (?, ?, ?)
      `;
      await pool.query(insertQuery, [guildId, userId, reason]);
    } else {
      const reasonsArray = existingReasons.split(', ');

      if (!reasonsArray.includes(reason)) {
        reasonsArray.push(reason);
        const updatedReasons = reasonsArray.join(', ');

        const updateQuery = `
          UPDATE strikes
          SET strike_reasons = ?
          WHERE guild_id = ? AND user_id = ?
        `;
        await pool.query(updateQuery, [updatedReasons, guildId, userId]);

        console.log('Strike logged successfully.');
      } else {
        console.log('Duplicate strike reason. Strike not logged.');
      }
    }
  } catch (error) {


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

async function getStrikeChannel(guildId) {
  try {
    const query = `
      SELECT channel_id
      FROM strike_channels
      WHERE guild_id = ?
    `;
    const [rows] = await pool.query(query, [guildId]);

    if (rows.length === 0) {
      console.log('Strike channel not set or not found.');
      return null;
    }

    const channelId = rows[0].channel_id;
    const channel = await client.channels.fetch(channelId);

    return channel;
  } catch (error) {
    console.error('Error retrieving strike channel:', error);
    return null;
  }
}

async function buildStrikeLogEmbed(guildId) {
  try {
    const query = `
      SELECT user_id, GROUP_CONCAT(strike_reasons SEPARATOR ', ') AS strike_reasons
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
        const { user_id, strike_reasons } = row;
        const reasonsArray = strike_reasons.split(', '); // Modify this based on the stored format
        const count = reasonsArray.length;

        embed.addFields({ name: `User: ${user_id}`, value: `Strikes: ${count}`, inline: true });

        // Add individual strike reasons as separate fields
        reasonsArray.forEach((reason, index) => {
          embed.addFields({ name: `Strike Reason ${index + 1}`, value: reason });
        });
      });
    }

    return embed;
  } catch (error) {
    console.error('Error building strike log embed:', error);
    return null;
  }
}

module.exports = {
  setStrikeChannel,
  logStrike,
  getStrikes,
  getStrikeChannel,
  buildStrikeLogEmbed,
};
