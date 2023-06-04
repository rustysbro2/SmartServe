// features/strikeFeature.js

const db = require('../database');
const { EmbedBuilder } = require('discord.js');

// Set the strike channel for a guild
async function setStrikeChannel(guildId, channelId) {
  try {
    await db.query('INSERT INTO strike_channels (guild_id, channel_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE channel_id = ?', [guildId, channelId, channelId]);

    // Get the strikes for all users in the guild
    const strikeData = await getStrikesForGuild(guildId);

    // Create the initial embed with strike data
    const embed = createStrikeEmbed(strikeData);

    // Find the strike channel
    const channel = client.channels.cache.get(channelId);

    // Send the initial embed to the strike channel
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error setting strike channel:', error);
  }
}

// Get the strikes for all users in the guild
async function getStrikesForGuild(guildId) {
  try {
    const query = 'SELECT user_id, COUNT(*) AS strikes FROM strikes WHERE guild_id = ? GROUP BY user_id';
    const strikes = await db.query(query, [guildId]);
    return strikes;
  } catch (error) {
    console.error('Error getting strikes for guild:', error);
    return [];
  }
}

// Create an embed with strike data
function createStrikeEmbed(strikeData) {
  const embed = new EmbedBuilder()
    .setTitle('Strikes')
    .setDescription('List of users with strikes:')
    .setColor('#FF0000');

  if (strikeData.length === 0) {
    embed.addField('No strikes', 'No users have been striked yet.');
  } else {
    strikeData.forEach((strike) => {
      const userTag = `<@${strike.user_id}>`;
      embed.addField(userTag, `Strikes: ${strike.strikes}`);
    });
  }

  return embed;
}

module.exports = {
  setStrikeChannel,
  // Other functions...
};
