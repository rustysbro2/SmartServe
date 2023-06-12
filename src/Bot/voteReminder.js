require('dotenv').config();
const fetch = require('isomorphic-fetch');
const pool = require('../database.js');
const userId = '385324994533654530';
const botId = '1105598736551387247';

// Get your top.gg token from the .env file
const TOPGG_TOKEN = process.env.TOPGG_TOKEN;

// Set the reminder interval (in milliseconds)
const REMINDER_INTERVAL = 1000; // 1 second

async function sendVoteReminder(client, userId) {
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

    if (botData.url) {
      // Send the vote reminder message with the actual vote URL
      const voteUrl = botData.url;
      user.send(`Don't forget to vote for the bot! You can vote [here](${voteUrl}).`);
    } else {
      // Handle the case where botData.url is undefined (no URL available)
      console.log(`No vote URL available for bot ID ${botId}`);
      // You can choose to send an alternative message or take other actions
    }
  } catch (error) {
    console.error('Error in sendVoteReminder function:', error);
  }
}

async function startVoteReminderLoop(client) {
  try {
    // Check if the lastVoteTime is null or undefined for any user
    const [result] = await pool.query('SELECT discordId FROM topgg_opt WHERE lastVoteTime IS NULL');
    const rows = Array.isArray(result) ? result : [result];

    if (rows.length > 0) {
      const currentTime = new Date();

      // Update the lastVoteTime only for users with null or undefined lastVoteTime
      await pool.query('UPDATE topgg_opt SET lastVoteTime = ?', [currentTime]);

      console.log('Initialized lastVoteTime for eligible users to the current time.');
    } else {
      console.log('No eligible users found for initializing lastVoteTime.');
    }

    // Call sendVoteReminder immediately after initializing the lastVoteTime
    const [voteReminderResult] = await pool.query('SELECT discordId FROM topgg_opt');
    const voteReminderRows = Array.isArray(voteReminderResult) ? voteReminderResult : [voteReminderResult];

    for (const row of voteReminderRows) {
      // Send a reminder to each user
      await sendVoteReminder(client, row.discordId);
    }
  } catch (error) {
    console.error('Error updating the database or sending vote reminders:', error);
  }

  // Start the interval after initializing lastVoteTime and sending reminders
  setInterval(async () => {
    // Get the current time 12 hours ago
    const twelveHoursAgo = new Date(Date.now() - REMINDER_INTERVAL);

    try {
      // Query the database for users who last voted more than 12 hours ago
      const [result] = await pool.query('SELECT discordId FROM topgg_opt WHERE lastVoteTime < ?', [twelveHoursAgo]);
      const rows = Array.isArray(result) ? result : [result]; // Convert single row to an array if needed

      console.log('Query result:', rows);

      for (const row of rows) {
        // Send a reminder to each user
        await sendVoteReminder(client, row.discordId);
      }
    } catch (error) {
      console.error('Error querying the database or sending vote reminders:', error);
    }
  }, REMINDER_INTERVAL);
}

async function simulateVote(client, userId, botId) {
  try {
    const currentTime = new Date();

    // Calculate the time 13 hours ago
    const lastVoteTime = new Date(currentTime.getTime() - 13 * 60 * 60 * 1000);

    // Update the lastVoteTime in the database based on discordId
    await pool.query('UPDATE topgg_opt SET lastVoteTime = ? WHERE discordId = ?', [lastVoteTime, userId]);

    // Fetch the optIn status from the database based on discordId
    const [row] = await pool.query('SELECT optIn FROM topgg_opt WHERE discordId = ?', [userId]);

    if (row && row.optIn) {
      // Send the reminder message
      const voteUrl = `https://top.gg/bot/${botId}/vote`;
      const user = await client.users.fetch(userId);
      if (!user) {
        console.log(`User with ID ${userId} not found.`);
        return;
      }
      user.send(`Don't forget to vote for the bot! You can vote [here](${voteUrl}).`);
    } else {
      console.log(`User with ID ${userId} has opted out of vote reminders.`);
    }
  } catch (error) {
    console.error('Error simulating vote:', error);
  }
}

async function addPreviouslyVotedUsers(client) {
  try {
    // Fetch the list of users who voted from top.gg API
    const response = await fetch(`https://top.gg/api/bots/${botId}/votes`, {
      headers: { 'Authorization': TOPGG_TOKEN }
    });
    const votes = await response.json();

    console.log('Votes from top.gg API:', votes);

    if (Array.isArray(votes)) {
      for (const vote of votes) {
        const userId = vote.id;
        const botId = vote.bot;

        console.log('Retrieved user ID:', userId);

        if (userId) {
          // Check if the user already exists in the database
          const [row] = await pool.query('SELECT * FROM topgg_opt WHERE discordId = ?', [userId]);

          if (row) {
            // User exists in the database
            if (row.lastVoteTime === null || botId !== row.lastVotedBot) {
              // Update the lastVoteTime and lastVotedBot only if the field is empty or if the user has voted for a different bot
              const currentTime = new Date();
              const lastVoteTime = new Date(currentTime.getTime() - 13 * 60 * 60 * 1000);
              await pool.query('UPDATE topgg_opt SET lastVoteTime = ?, lastVotedBot = ? WHERE discordId = ?', [lastVoteTime, botId, userId]);
              console.log('Updated lastVoteTime for user:', userId);
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
  simulateVote,
  addPreviouslyVotedUsers
};
