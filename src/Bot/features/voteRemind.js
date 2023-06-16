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
  // Select users who have never voted and 12 hours have passed since the initial reminder
  const [neverVotedRows] = await connection.query(
    'SELECT user_id, initial_reminder_time, recurring_remind_time FROM users WHERE voted = 0 AND initial_reminder_sent = 1'
  );

  const currentTime = Date.now();

  const neverVotedPromises = neverVotedRows.map(async row => {
    const initialReminderTime = new Date(row.initial_reminder_time).getTime();
    const recurringReminderTime = row.recurring_remind_time ? new Date(row.recurring_remind_time).getTime() : null;

    // Check if 12 hours have passed since the initial reminder or the recurring reminder time
    if (
      currentTime - initialReminderTime >= 12 * 60 * 60 * 1000 ||
      (recurringReminderTime !== null && currentTime - recurringReminderTime >= 12 * 60 * 60 * 1000)
    ) {
      console.log(`Fetching user with ID: ${row.user_id}`);
      if (row.user_id) {
        const user = await client.users.fetch(row.user_id);

        // Check if the user has opted out
        const [[userData]] = await connection.query('SELECT * FROM users WHERE user_id = ?', [row.user_id]);
        if (userData.opt_out !== 1) {
          const userHasReceivedReminder =
            recurringReminderTime !== null && currentTime - recurringReminderTime < 12 * 60 * 60 * 1000;

          if (!userHasReceivedReminder) {
            const message = `Hello! It seems you haven't voted yet. Please consider voting for our bot by visiting the vote link: ${topGGVoteLink}\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;
            sendDM(user, message);
            // Update the recurring_remind_time in the database to the current time
            await connection.query('UPDATE users SET recurring_remind_time = ? WHERE user_id = ?', [
              new Date(),
              row.user_id
            ]);
          }
        }
      } else {
        console.log('User ID is null');
      }
    }
  });

  await Promise.all(neverVotedPromises);
}

async function checkAllGuildMembers(client) {
  client.guilds.cache.forEach(async guild => {
    console.log(`Checking guild: ${guild.name}`);

    guild.members.fetch().then(async members => {
      members.forEach(async member => {
        // Skip if the member is a bot
        if (member.user.bot) {
          return;
        }

        // Check and record vote status
        await checkAndRecordUserVote(member);
      });
    });
  });

  // Immediately send recurring reminders
  await sendRecurringReminders(client);

  // Then continue sending them every hour
  setInterval(() => sendRecurringReminders(client), 1000 * 60 * 60);
}

module.exports = {
  checkAndRecordUserVote,
  checkAllGuildMembers
};
