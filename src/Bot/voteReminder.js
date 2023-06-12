require('dotenv').config();
const fetch = require('isomorphic-fetch');
const pool = require('../database.js');

const TOPGG_TOKEN = process.env.TOPGG_TOKEN;
const botId = process.env.BOT_ID;


// Set the reminder interval (in milliseconds)
const REMINDER_INTERVAL = 1000 * 60 * 5; // 5 minutes

async function sendVoteReminder(client, userId, botId) {
  try {
    const user = await client.users.fetch(userId);
    if (!user) {
      console.log(`User with ID ${userId} not found.`);
      return;
    }

    const response = await fetch(`https://top.gg/api/bots/${botId}`, {
      headers: { 'Authorization': TOPGG_TOKEN }
    });
    const botData = await response.json();

    if (botData.id === botId) {
      // Construct the vote URL
      const voteUrl = `https://top.gg/bot/${botId}/vote`;
      user.send(`Don't forget to vote for the bot! You can vote [here](${voteUrl}).`);
    } else {
      console.log(`Bot with ID ${botId} not found on top.gg.`);
    }
  } catch (error) {
    console.error('Error in sendVoteReminder function:', error);
  }
}

async function startVoteReminderLoop(client, botId) {
  // Call sendVoteReminder immediately without updating lastVoteTime
  const [result] = await pool.query('SELECT discordId FROM topgg_opt');
  const rows = Array.isArray(result) ? result : [result]; // Convert single row to an array if needed

  for (const row of rows) {
    // Send a reminder to each user
    await sendVoteReminder(client, row.discordId, botId);
  }

  // Start the interval after sending reminders
  setInterval(async () => {
    // Get the current time 12 hours ago
    const twelveHoursAgo = new Date(Date.now() - REMINDER_INTERVAL);

    try {
      // Query the database for users who last voted more than 12 hours ago
      const [result] = await pool.query('SELECT discordId FROM topgg_opt WHERE lastVoteTime < ?', [twelveHoursAgo]);
      const rows = Array.isArray(result) ? result : [result]; // Convert single row to an array if needed

      console.log('Checking users for vote reminders:', rows);

      for (const row of rows) {
        // Send a reminder to each user
        await sendVoteReminder(client, row.discordId, botId);
      }
    } catch (error) {
      console.error('Error querying the database:', error);
    }
  }, REMINDER_INTERVAL);
}

async function addPreviouslyVotedUsers(client, botId) {
  try {
    // Fetch the list of users who voted from top.gg API
    const url = `https://top.gg/api/bots/${botId}/votes`;
    console.log('API Request URL:', url);

    const response = await fetch(url, {
      headers: { 'Authorization': TOPGG_TOKEN }
    });

    // Log rate limit headers
    console.log('Rate Limit Headers:', {
      limit: response.headers.get('X-RateLimit-Limit'),
      remaining: response.headers.get('X-RateLimit-Remaining'),
      reset: response.headers.get('X-RateLimit-Reset')
    });

    if (response.status === 401) {
      console.error('Unauthorized: Invalid top.gg API token or insufficient permissions.');
      return;
    }

    const votes = await response.json();

    console.log('Votes from top.gg API:', votes);

    if (Array.isArray(votes)) {
      for (const vote of votes) {
        const userId = vote.id;

        console.log('Retrieved user ID:', userId);

        if (userId) {
          // Check if the user already exists in the database
          const [row] = await pool.query('SELECT * FROM topgg_opt WHERE discordId = ?', [userId]);

          if (row) {
            // User exists in the database
            if (row.lastVotedBot !== botId) {
              // Update the lastVotedBot only if the user has voted for a different bot
              const currentTime = new Date();
              const lastVoteTime = new Date(currentTime.getTime() - 13 * 60 * 60 * 1000);
              await pool.query('UPDATE topgg_opt SET lastVotedBot = ? WHERE discordId = ?', [botId, userId]);
              console.log('Updated lastVotedBot for user:', userId);
            }
          } else {
            // User does not exist in the database, insert a new row
            await pool.query('INSERT INTO topgg_opt (discordId, optIn, lastVoteTime, lastVotedBot) VALUES (?, ?, ?, ?)', [userId, true, null, botId]);
            console.log('Inserted new user into the database:', userId);
          }
        }
      }
    } else {
      console.error('Error retrieving votes from top.gg API:', votes);
    }
  } catch (error) {
    console.error('Error adding previously voted users to the database:', error);
  }
}

module.exports = {
  startVoteReminderLoop,
  addPreviouslyVotedUsers
};
