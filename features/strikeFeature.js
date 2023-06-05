const { EmbedBuilder, ChannelBuilder } = require('discord.js');
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

    console.log('Rows:', rows);

    if (!rows || Object.keys(rows).length === 0) {
      console.log('No existing strikes found for the user.');
      const insertQuery = `
        INSERT INTO strikes (guild_id, user_id, strike_reasons)
        VALUES (?, ?, ?)
      `;
      await pool.query(insertQuery, [guildId, userId, reason]);
    } else {
      const existingReasons = rows.strike_reasons;
      const updatedReasons = existingReasons ? `${existingReasons}, ${reason}` : reason;

      const updateQuery = `
        UPDATE strikes
        SET strike_reasons = ?
        WHERE guild_id = ? AND user_id = ?
      `;
      await pool.query(updateQuery, [updatedReasons, guildId, userId]);
    }

    console.log('Strike logged successfully.');

    // Send strike log embed to the strike channel
    const strikeLogEmbed = await buildStrikeLogEmbed(guildId);
    const channel = await getStrikeChannel(guildId);

    if (channel && strikeLogEmbed) {
      channel.send({ embeds: [strikeLogEmbed] });
      console.log('Strike log embed sent.');
    } else {
      console.log('Strike log embed or channel not found.');
    }
  } catch (error) {
    console.error('Error logging strike:', error);
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
      return null;
    }

    const channelId = rows[0].channel_id;
    const channel = ChannelBuilder.create(channelId);

    return channel;
  } catch (error) {
    console.error('Error retrieving strike channel:', error);
    return null;
  }
}

async function buildStrikeLogEmbed(guildId) {
  try {
    const query = `
      SELECT user_id, strike_reasons
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
        const reasonsArray = strike_reasons.split(','); // Modify this based on the stored format
        const count = reasonsArray.length;

        embed.addFields({ name: `User: ${user_id}`, value: `Strikes: ${count}`, inline: true });

        reasonsArray.forEach((reason, index) => {
          embed.addFields({ name: `Strike Reason ${index + 1}`, value: reason });
        });
      });
    }

    console.log('Strike log embed built successfully.');

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
  buildStrikeLogEmbed,
};
