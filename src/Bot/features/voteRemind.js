const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config(); // Import dotenv and load environment variables

const botId = process.env.BOT_ID;
const topGGToken = process.env.TOPGG_TOKEN;
const supportServerLink = 'https://discord.gg/wtzp28pHRK'; // Replace with your support server link
const topGGVoteLink = `https://top.gg/bot/${botId}/vote`; // Top.gg vote link

// MySQL connection settings
const connection = mysql.createPool({
  host: 'localhost',
  user: 'rustysbro',
  password: 'Dincas50@/',
  database: 'SmartBeta',
});

async function sendDM(user, message) {
  try {
    await user.send(message);
  } catch (error) {
    console.error(`Failed to send DM to ${user.tag}`);
  }
}

async function checkAndRecordUserVote(member) {
  console.log(`Checking vote status for user: ${member.user.tag}`);

  try {
    // Check if the user has voted
    const response = await axios.get(`https://top.gg/api/bots/${botId}/check`, {
      params: {
        userId: member.user.id,
      },
      headers: {
        Authorization: topGGToken,
      },
    });

    const voteStatus = response.data.voted;

    // Update the vote status in the database
    const [results] = await connection.query(
      'INSERT INTO users (user_id, voted, initial_reminder_sent, opt_out) VALUES (?, ?, 0, 0) ON DUPLICATE KEY UPDATE voted = VALUES(voted), initial_reminder_sent = initial_reminder_sent',
      [member.user.id, voteStatus]
    );

    console.log(`User ${member.user.tag} has ${voteStatus === 1 ? '' : 'not '}voted.`);

    // If the user hasn't voted and the initial reminder hasn't been sent yet, send it.
    const [[user]] = await connection.query('SELECT * FROM users WHERE user_id = ?', [member.user.id]);
    if (user.voted === 0 && user.initial_reminder_sent === 0 && user.opt_out === 0) {
      // Send an initial reminder DM
      let message = `Hello, ${member.user}! It seems you haven't voted yet. Please consider voting for our bot by visiting the vote link: ${topGGVoteLink}\n\nYou won't receive further reminders unless you opt in to reminders.`;

      // Mention the owner (e.g., @cmdr_ricky#0)
      message += ` The owner of the bot is <@385324994533654530>.`;

      // Add the support server link
      message += `\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;

      sendDM(member.user, message);
      
      // Update the initial_reminder_sent flag in the database
      await connection.query('UPDATE users SET initial_reminder_sent = 1 WHERE user_id = ?', [member.user.id]);
    } else if (user.opt_out === 1) {
      sendDM(
        member.user,
        `Hello, ${member.user}! You have opted out of recurring reminders. If you change your mind and want to receive reminders again, use the command /optin.\n\nJoin our support server for any assistance or questions: ${supportServerLink}`
      );
    }
  } catch (error) {
    console.error('Error checking vote status:', error);
  }
}

async function sendRecurringReminders(client) {
  const [users] = await connection.query('SELECT * FROM users WHERE voted = 0 AND opt_out = 0');

  users.forEach(async user => {
    const currentTime = Date.now();
    const recurringReminderTime = new Date(user.recurring_remind_time).getTime();

    // Calculate the remaining time until the next 12-hour mark based on the recurring reminder time
    const nextReminderTime = Math.ceil(recurringReminderTime / (12 * 60 * 60 * 1000)) * (12 * 60 * 60 * 1000);
    const delay = nextReminderTime - currentTime;

    // Check if the user has reached the next 12-hour mark
    if (currentTime >= nextReminderTime) {
      const discordUser = await client.users.fetch(user.user_id);
      const message = `Hello! It seems you haven't voted yet. Please consider voting for our bot by visiting the vote link: ${topGGVoteLink}\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;
      sendDM(discordUser, message);

      // Update the recurring_remind_time in the database to the current time
      await connection.query('UPDATE users SET recurring_remind_time = ? WHERE user_id = ?', [new Date(), user.user_id]);
    } else {
      // Schedule the next recurring reminder based on the remaining time
      setTimeout(() => {
        sendRecurringReminders(client); // Send the next recurring reminder
      }, delay);
    }
  });
}

module.exports = {
  checkAndRecordUserVote,
  checkAllGuildMembers
};
