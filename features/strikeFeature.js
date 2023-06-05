// strikeFeature.js

const pool = require('../database.js');

let strikeChannels = {}; // Object to store the strike channels by guild ID

async function logStrike(guildId, userId, reason, client) {
  // Log the strike in the database
  const logStrikeQuery = `
    INSERT INTO strikes (guildId, userId, reason)
    VALUES (?, ?, ?)
  `;

  try {
    await pool.query(logStrikeQuery, [guildId, userId, reason]);
    console.log(`Strike logged for user ${userId} in guild ${guildId}: ${reason}`);

    // Send a strike notification to the user
    const user = await client.users.fetch(userId);
    if (user) {
      user.send(`You have received a strike in guild ${guildId} for the following reason: ${reason}`);
      console.log(`Strike notification sent to user ${userId}`);
    }
  } catch (error) {
    console.error('Error logging strike:', error);
  }
}

function setStrikeChannel(guildId, channelId) {
  strikeChannels[guildId] = channelId;
  console.log(`Strike channel set for guild ${guildId}: ${channelId}`);
}

function getStrikeChannel(guildId) {
  return strikeChannels[guildId];
}

module.exports = { logStrike, setStrikeChannel, getStrikeChannel };
