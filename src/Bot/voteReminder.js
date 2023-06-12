require('dotenv').config();
const fetch = require('isomorphic-fetch');
const pool = require('../database.js');
const userId = '385324994533654530';
const botId = '1105598736551387247';

// Get your top.gg token from the .env file
const TOPGG_TOKEN = process.env.TOPGG_TOKEN;

// Set the reminder interval (in milliseconds)
const REMINDER_INTERVAL = 300000; // 5 minutes in milliseconds

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

    if (botData.error) {
      console.log(`Error retrieving bot data: ${botData.error}`);
      return;
    }

    if (botData.invite) {
      // Send the vote reminder message with the actual vote URL
      const voteUrl = `https://top.gg/bot/${botId}/vote`;
      user.send(`Don't forget to vote for the bot! You can vote [here](${voteUrl}).`);
    } else {
      console.log(`No vote URL available for bot ID ${botId}`);
      // You can choose to send an alternative message or take other actions
    }
  } catch (error) {
    console.error('Error in sendVoteReminder function:', error);
  }
}


async function startVoteReminderLoop(client) {
  try {
    // Fetch all users from the topgg_opt table
    const [result] = await pool.query('SELECT discordId FROM topgg_opt');
    const rows = Array.isArray(result) ? result : [result]; // Convert single row to an array if needed

    console.log('Checking users for vote reminders:', rows);

    for (const row of rows) {
      // Send a reminder to each user
      await sendVoteReminder(client, row.discordId);
    }
  } catch (error) {
    console.error('Error retrieving users from the database:', error);
  }

  // Start the interval after sending reminders
  setInterval(async () => {
    // Fetch all users from the topgg_opt table again
    try {
      const [result] = await pool.query('SELECT discordId FROM topgg_opt');
      const rows = Array.isArray(result) ? result : [result]; // Convert single row to an array if needed

      console.log('Checking users for vote reminders:', rows);

      for (const row of rows) {
        // Send a reminder to each user
        await sendVoteReminder(client, row.discordId);
      }
    } catch (error) {
      console.error('Error retrieving users from the database:', error);
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
  simulateVote,
  addPreviouslyVotedUsers
};
