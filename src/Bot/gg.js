const pool = require('../database.js');
const client = require('./bot.js'); // Replace with the actual path to your client file

async function sendVoteReminder(userId) {
  try {
    // Retrieve user information for the vote reminder
    const userResult = await pool.query('SELECT * FROM users WHERE discord_id = ?', [userId]);
    const user = userResult[0];

    // Use the existing client instance to send the vote reminder
    const userDM = await client.users.fetch(userId);

    // Send the vote reminder as a DM
    await userDM.send('Reminder: Don\'t forget to vote!');

    console.log(`Vote reminder sent to user with Discord ID ${userId}`);
  } catch (error) {
    console.error(`Error sending vote reminder to user with Discord ID ${userId}:`, error);
  }
}

async function scheduleVoteReminders() {
  try {
    // Retrieve users who haven't been reminded and have a vote timestamp
    const query = 'SELECT discord_id FROM users WHERE reminder_sent = 0 AND vote_timestamp IS NOT NULL';
    const [rows] = await pool.query(query);

    const currentTime = new Date();

    // Iterate over the users and schedule the reminders
    for (const row of rows) {
      const userId = row.discord_id;

      // Retrieve user's vote timestamp
      const voteTimestampResult = await pool.query('SELECT vote_timestamp FROM users WHERE discord_id = ?', [userId]);
      const voteTimestamp = voteTimestampResult[0].vote_timestamp;

      // Calculate the time difference between the current time and the vote timestamp
      const timeDifference = currentTime - voteTimestamp;

      // Schedule the reminder if it has been 12 hours since the user voted
      if (timeDifference >= 12 * 60 * 60 * 1000) {
        // Send the vote reminder to the user
        await sendVoteReminder(userId);

        // Update the reminder_sent flag to indicate that the reminder has been sent
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
