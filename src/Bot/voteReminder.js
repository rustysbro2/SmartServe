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

    const voteUrl = botData?.url || 'https://top.gg/'; // Use optional chaining operator to handle undefined botData.url

    user.send(`Don't forget to vote for the bot! You can vote [here](${voteUrl}).`);
  } catch (error) {
    console.error('Error in sendVoteReminder function:', error);
  }
}


// Function to start the reminder loop
async function startVoteReminderLoop(client) {
  // Initialize lastVoteTime for all users to the current time
  const currentTime = new Date();

  try {
    await pool.query('UPDATE topgg_opt SET lastVoteTime = ?', [currentTime]);
    console.log('Initialized lastVoteTime for all users to the current time.');
  } catch (error) {
    console.error('Error updating the database:', error);
  }

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
      console.error('Error querying the database:', error);
    }
  }, REMINDER_INTERVAL);
}

// Function to simulate a vote for testing
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

async function startVoteReminderLoop(client) {
  // Initialize lastVoteTime for all users to the current time
  const currentTime = new Date();

  try {
    await pool.query('UPDATE topgg_opt SET lastVoteTime = ?', [currentTime]);
    console.log('Initialized lastVoteTime for all users to the current time.');

    // Call sendVoteReminder immediately after initializing the lastVoteTime
    const [result] = await pool.query('SELECT discordId FROM topgg_opt');
    const rows = Array.isArray(result) ? result : [result]; // Convert single row to an array if needed

    for (const row of rows) {
      // Send a reminder to each user
      await sendVoteReminder(client, row.discordId);
    }
  } catch (error) {
    console.error('Error updating the database:', error);
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
      console.error('Error querying the database:', error);
    }
  }, REMINDER_INTERVAL);
}



module.exports = {
  startVoteReminderLoop,
  simulateVote,
  addPreviouslyVotedUsers
};
