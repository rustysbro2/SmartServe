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

    const strikeCount = await getStrikes(guildId, userId);
    const strikeLogEmbed = await buildStrikeLogEmbed(guildId, userId, strikeCount);

    const channelQuery = `
      SELECT channel_id
      FROM strike_channels
      WHERE guild_id = ?
    `;
    const [rows] = await pool.query(channelQuery, [guildId]);

    if (rows.length > 0) {
      const channelId = rows[0].channel_id;
      const channel = await interaction.guild.channels.cache.get(channelId);
      await channel.send({ embeds: [strikeLogEmbed] });
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

    return rows[0].count;
  } catch (error) {
    console.error('Error retrieving strikes:', error);
    return 0;
  }
}

async function buildStrikeLogEmbed(guildId, userId, strikeCount) {
  try {
    const user = await interaction.guild.members.fetch(userId);
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Strike Log')
      .setDescription(`Strike logged for user ${user.toString()} (${user.id})`)
      .addField('Reason', reason)
      .addField('Total Strikes', strikeCount)
      .setTimestamp();

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