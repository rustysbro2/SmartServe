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

async function logStrike(userId, reason, channelId, message, client) {
  try {
    await createStrikeTables();

    const guildId = message.guild?.id;

    console.log('Guild ID:', guildId);

    if (!guildId) {
      console.log('Invalid guild ID.');
      return;
    }

    const insertReasonQuery = `
      INSERT INTO strike_reasons (strike_reason, guild_id, user_id)
      VALUES (?, ?, ?)
    `;
    await pool.query(insertReasonQuery, [reason, guildId, userId]);

    console.log('Strike logged successfully.');

    const selectChannelQuery = `
      SELECT channel_id
      FROM strike_channels
      WHERE guild_id = ?
      LIMIT 1
    `;
    const [channelRow] = await pool.query(selectChannelQuery, [guildId]);
    const strikeChannelId = channelRow?.[0]?.channel_id || '';

    console.log('Channel ID:', strikeChannelId);

    if (!strikeChannelId) {
      console.log('Strike channel not set.');
      return;
    }

    // Fetch the guild using the guildId from the database
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.log('Guild not found.');
      return;
    }

    const strikeChannel = guild.channels.cache.get(strikeChannelId);
    if (!strikeChannel) {
      console.log('Strike channel not found.');
      return;
    }

    // Get updated strike data for the guild
    const strikeData = await getStrikeData(guildId);

    console.log('Strike Data:', strikeData);

    if (!strikeData || !Array.isArray(strikeData)) {
      console.log('Invalid strike data.');
      return;
    }

    // Create and update the embed
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('Strike Record')
      .setDescription(`Strike record for guild: ${guildId}`)
      .setTimestamp();

    for (const strike of strikeData) {
      const { user_id, count } = strike;
      const user = await client.users.fetch(user_id);
      if (user) {
        const username = user.tag;
        const reasons = await getStrikeReasons(guildId, user_id);
        const reasonsText = reasons.map((reason) => reason.strike_reason).join('\n');
        embed.addFields({ name: `${username} (${user_id}) - Strikes: ${count}`, value: reasonsText || 'No reasons provided' });
      }
    }

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

    console.log('Strike Data:', rows);

    return Array.isArray(rows) ? rows : [];
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
