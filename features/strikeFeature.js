const { EmbedBuilder } = require('discord.js');
const pool = require('../database.js');

async function createStrikeTables() {
  try {
    const strikesTableQuery = `
      CREATE TABLE IF NOT EXISTS strikes (
        guild_id VARCHAR(20) NOT NULL,
        user_id VARCHAR(20) NOT NULL,
        PRIMARY KEY (guild_id, user_id)
      )
    `;
    await pool.query(strikesTableQuery);

    const strikeReasonsTableQuery = `
      CREATE TABLE IF NOT EXISTS strike_reasons (
        strike_id INT AUTO_INCREMENT PRIMARY KEY,
        strike_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        strike_reason TEXT,
        guild_id VARCHAR(20),
        user_id VARCHAR(20),
        FOREIGN KEY (guild_id, user_id)
          REFERENCES strikes(guild_id, user_id)
          ON DELETE CASCADE
      )
    `;
    await pool.query(strikeReasonsTableQuery);

    const strikeChannelsTableQuery = `
      CREATE TABLE IF NOT EXISTS strike_channels (
        guild_id VARCHAR(20) PRIMARY KEY,
        channel_id VARCHAR(20) NOT NULL
      )
    `;
    await pool.query(strikeChannelsTableQuery);

    console.log('Strike tables created successfully.');
  } catch (error) {
    console.error('Error creating strike tables:', error);
  }
}

async function setStrikeChannel(guildId, channelId) {
  try {
    await createStrikeTables();

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

async function logStrike(guildId, userId, reason, client) {
  try {
    await createStrikeTables();

    const selectQuery = `
      SELECT strike_reason
      FROM strike_reasons
      WHERE guild_id = ? AND user_id = ?
    `;
    const [rows] = await pool.query(selectQuery, [guildId, userId]);

    console.log('Rows:', rows);

    if (!rows || rows.length === 0) {
      console.log('No existing strikes found for the user.');
      const insertQuery = `
        INSERT INTO strikes (guild_id, user_id)
        VALUES (?, ?)
      `;
      await pool.query(insertQuery, [guildId, userId]);
    }

    const insertReasonQuery = `
      INSERT INTO strike_reasons (strike_reason, guild_id, user_id)
      VALUES (?, ?, ?)
    `;
    await pool.query(insertReasonQuery, [reason, guildId, userId]);

    console.log('Strike logged successfully.');

    // Get the strike channel ID from the database
    const selectChannelQuery = `
      SELECT channel_id
      FROM strike_channels
      WHERE guild_id = ?
    `;
    const [channelRows] = await pool.query(selectChannelQuery, [guildId]);

    console.log('Channel Rows:', channelRows);

    if (!channelRows || channelRows.length === 0) {
      console.log('Strike channel not set.');
      return;
    }

    const strikeChannelId = channelRows.channel_id;
    console.log('Strike Channel ID:', strikeChannelId);

    // Fetch the strike channel
    const strikeChannel = await client.channels.fetch(strikeChannelId);
    if (!strikeChannel) {
      console.log('Strike channel not found.');
      return;
    }

    // Get updated strike data for the guild
    const strikeData = await getStrikeData(guildId);

    // Create and update the embed
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('Strike Record')
      .setDescription(`Strike record for guild: ${guildId}`)
      .setTimestamp();

    strikeData.forEach(async (strike) => {
      const { user_id, count } = strike;
      const user = guild.members.cache.get(user_id);
      if (user) {
        const username = user.user.tag;
        const reasons = strikeReasons.filter((reason) => reason.user_id === user_id);
        const reasonsText = reasons.map((reason) => reason.strike_reason).join('\n');
        embed.addFields({ name: `${username} (${user_id}) - Strikes: ${count}`, value: reasonsText || 'No reasons provided' });
      }
    });

    // Find the existing strike record message in the strike channel
    const messages = await strikeChannel.messages.fetch({ limit: 100 });
    const strikeRecordMessage = messages.find((msg) => msg.author.id === client.user.id && msg.embeds.length > 0 && msg.embeds[0].title === 'Strike Record');

    if (strikeRecordMessage) {
      // If an existing strike record message is found, edit the message with the updated embed
      await strikeRecordMessage.edit({ embeds: [embed] });
      console.log('Strike record message updated.');
    } else {
      // If no existing strike record message is found, send a new message with the embed
      await strikeChannel.send({ embeds: [embed] });
      console.log('New strike record message sent.');
    }
  } catch (error) {
    console.error('Error logging strike:', error);
  }
}








async function getStrikes(guildId, userId) {
  try {
    await createStrikeTables();

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
    await createStrikeTables();

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
