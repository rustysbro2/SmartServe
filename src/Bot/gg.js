const pool = require('../database.js');
const client = require('./bot.js');

async function sendVoteReminder(userId) {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE discord_id = ?', [userId]);
    const user = userResult[0];
    const userDM = await client.users.fetch(userId);

    await userDM.send('Reminder: Don\'t forget to vote!');
    console.log(`Vote reminder sent to user with Discord ID ${userId}`);
  } catch (error) {
    console.error(`Error sending vote reminder to user with Discord ID ${userId}:`, error);
  }
}

async function scheduleVoteReminders() {
  try {
    const query = 'SELECT discord_id FROM users WHERE reminder_sent = 0 AND vote_timestamp IS NOT NULL';
    const [rows] = await pool.query(query);

    console.log('Query Result:', rows);

    const currentTime = new Date();

    for (const row of rows) {
      const userId = row.discord_id;
      console.log('Processing user:', userId);

      const voteTimestampResult = await pool.query('SELECT vote_timestamp FROM users WHERE discord_id = ?', [userId]);
      const voteTimestamp = voteTimestampResult[0].vote_timestamp;

      const timeDifference = currentTime - voteTimestamp;

      if (timeDifference >= 12 * 60 * 60 * 1000) {
        await sendVoteReminder(userId);

        await pool.query('UPDATE users SET reminder_sent = 1 WHERE discord_id = ?', [userId]);

        console.log(`Vote reminder scheduled and sent to user with Discord ID ${userId}`);
      }
    }
  } catch (error) {
    console.error('Error scheduling vote reminders:', error);
  }
}

module.exports = {
  scheduleVoteReminders,
};
