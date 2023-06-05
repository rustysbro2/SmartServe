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
    const existingReasons = rows[0]?.strike_reasons ?? '';

    const updatedReasons = existingReasons ? `${existingReasons}, ${reason}` : reason;

    const updateQuery = `
      INSERT INTO strikes (guild_id, user_id, strike_reasons)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE strike_reasons = ?
    `;
    await pool.query(updateQuery, [guildId, userId, updatedReasons, updatedReasons]);

    console.log('Strike logged successfully.');

    // Retrieve the strike count and reasons after the strike is logged
    const strikeCount = await getStrikes(guildId, userId);
    const strikeReasons = await getStrikeReasons(guildId, userId);

    // Build and send the strike log embed
    const strikeLogEmbed = buildStrikeLogEmbed(guildId, userId, strikeCount, strikeReasons);
    if (strikeLogEmbed) {
      await sendStrikeLogEmbed(guildId, strikeLogEmbed);
    }
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

    if (rows.length === 0) {
      return 0;
    }

    return rows[0].count;
  } catch (error) {
    console.error('Error retrieving strikes:', error);
    return 0;
  }
}

async function getStrikeReasons(guildId, userId) {
  try {
    const query = `
      SELECT strike_reasons
      FROM strikes
      WHERE guild_id = ? AND user_id = ?
    `;
    const [rows] = await pool.query(query, [guildId, userId]);

    if (rows.length === 0) {
      return '';
    }

    return rows[0].strike_reasons;
  } catch (error) {
    console.error('Error retrieving strike reasons:', error);
    return '';
  }
}

async function buildStrikeLogEmbed(guildId, userId, strikeCount, strikeReasons) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Strike Log')
      .setDescription('Here is the strike log for this guild:')
      .setTimestamp();

    if (strikeCount === 0) {
      embed.addFields({ name: 'No strikes found', value: 'No users have been struck yet.' });
    } else {
      embed.addFields({ name: `User: ${userId}`, value: `Strikes: ${strikeCount}`, inline: true });

      // Add individual strike reasons as separate fields
      if (strikeReasons) {
        const reasonsArray = strikeReasons.split(',');

        reasonsArray.forEach((reason, index) => {
          embed.addFields({ name: `Strike Reason ${index + 1}`, value: reason });
        });
      }
    }

    return embed;
  } catch (error) {
    console.error('Error building strike log embed:', error);
    return null;
  }
}

async function sendStrikeLogEmbed(guildId, embed) {
  try {
    const query = `
      SELECT channel_id
      FROM strike_channels
      WHERE guild_id = ?
    `;
    const [rows] = await pool.query(query, [guildId]);

    if (rows.length === 0) {
      console.error('No strike channel found for guild:', guildId);
      return;
    }

    const channelId = rows[0].channel_id;

    // Retrieve the channel object
    const channel = client.channels.cache.get(channelId);

    // Send the embed to the channel
    await channel.send({ embeds: [embed] });
    console.log('Strike log embed sent successfully.');
  } catch (error) {
    console.error('Error sending strike log embed:', error);
  }
}

module.exports = {
  setStrikeChannel,
  logStrike,
  getStrikes,
  buildStrikeLogEmbed,
};
