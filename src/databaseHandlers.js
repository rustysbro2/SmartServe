const { pool } = require('./database');

async function getJoinMessageChannelFromDatabase(guildId) {
  try {
    const [rows] = await pool.query('SELECT join_message_channel, target_guild_id FROM guilds WHERE target_guild_id = ?', [guildId]);
    if (rows.length > 0) {
      const joinMessageChannel = rows[0];
      console.log('Retrieved join message channel:', joinMessageChannel);
      return joinMessageChannel;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving join message channel from the database:', error);
    throw error;
  }
}

async function getLeaveMessageChannelFromDatabase() {
  try {
    const [rows] = await pool.query('SELECT leave_message_channel, target_guild_id FROM guilds LIMIT 1');
    if (rows.length > 0) {
      const leaveMessageChannel = rows[0];
      console.log('Retrieved leave message channel:', leaveMessageChannel);
      return leaveMessageChannel;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving leave message channel from the database:', error);
    throw error;
  }
}

async function saveJoinMessageChannelToDatabase(channelId, guildId) {
  try {
    await pool.query('INSERT INTO guilds (join_message_channel, target_guild_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE join_message_channel = ?', [channelId, guildId, channelId]);
  } catch (error) {
    console.error('Error saving join message channel to the database:', error);
    throw error;
  }
}

async function saveLeaveMessageChannelToDatabase(channelId, guildId) {
  try {
    await pool.query('INSERT INTO guilds (leave_message_channel, target_guild_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE leave_message_channel = ?', [channelId, guildId, channelId]);
  } catch (error) {
    console.error('Error saving leave message channel to the database:', error);
    throw error;
  }
}

module.exports = {
  getJoinMessageChannelFromDatabase,
  getLeaveMessageChannelFromDatabase,
  saveJoinMessageChannelToDatabase,
  saveLeaveMessageChannelToDatabase,
};
