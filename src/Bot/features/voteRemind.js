const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

const botId = process.env.BOT_ID;
const topGGToken = process.env.TOPGG_TOKEN;
const supportServerLink = 'https://discord.gg/wtzp28pHRK'; // Replace with your support server link
const topGGVoteLink = `https://top.gg/bot/${botId}/vote`; // Top.gg vote link
const ownerUserId = '385324994533654530'; // Replace with the actual owner's user ID

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

async function sendRecurringReminders(client) {
  const [neverVotedRows] = await connection.query(
    'SELECT user_id, initial_reminder_time, recurring_remind_time FROM users WHERE voted = 0 AND initial_reminder_sent = 1'
  );

  const currentTime = Date.now();

  const neverVotedPromises = neverVotedRows.map(async (row) => {
    const initialReminderTime = new Date(row.initial_reminder_time).getTime();
    const recurringReminderTime = row.recurring_remind_time ? new Date(row.recurring_remind_time).getTime() : null;

    if (
      currentTime - initialReminderTime >= 12 * 60 * 60 * 1000 ||
      (recurringReminderTime !== null && currentTime - recurringReminderTime >= 12 * 60 * 60 * 1000)
    ) {
      console.log(`Fetching user with ID: ${row.user_id}`);
      if (row.user_id) {
        const user = await client.users.fetch(row.user_id);

        const [[userData]] = await connection.query('SELECT * FROM users WHERE user_id = ?', [row.user_id]);
        if (userData.opt_out !== 1) {
          const userHasReceivedReminder =
            recurringReminderTime !== null && currentTime - recurringReminderTime < 12 * 60 * 60 * 1000;

          if (!userHasReceivedReminder) {
            const voteLink = `https://top.gg/bot/${botId}/vote`;
            let message = `Hello! It seems you haven't voted yet. Please consider voting for our bot by visiting the vote link: ${voteLink}\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;

            const owner = await client.users.fetch(ownerUserId);
            message += ` The owner of the bot is ${owner}.`;

            sendDM(user, message);
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

async function checkAndRecordUserVote(member) {
  console.log(`Checking vote status for user: ${member.user.tag}`);

  try {
    const response = await axios.get(`https://top.gg/api/bots/${botId}/check`, {
      params: {
        userId: member.user.id,
      },
      headers: {
        Authorization: topGGToken,
      },
    });

    const voteStatus = response.data.voted;

    const [results] = await connection.query(
      'INSERT INTO users (user_id, voted, initial_reminder_sent, opt_out) VALUES (?, ?, 0, 0) ON DUPLICATE KEY UPDATE voted = VALUES(voted), initial_reminder_sent = initial_reminder_sent',
      [member.user.id, voteStatus]
    );

    console.log(`User ${member.user.tag} has ${voteStatus === 1 ? '' : 'not '}voted.`);

    const [[user]] = await connection.query('SELECT * FROM users WHERE user_id = ?', [member.user.id]);
    if (user.voted === 0 && user.initial_reminder_sent === 0 && user.opt_out === 0) {
      let message = `Hello, ${member.user}! It seems you haven't voted yet. Please consider voting for our bot by visiting the vote link: ${topGGVoteLink}\n\nYou won't receive further reminders unless you opt in to reminders. The owner of the bot is <@${ownerUserId}>.`;

      message += `\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;

      sendDM(member.user, message);

      await connection.query('UPDATE users SET initial_reminder_sent = 1 WHERE user_id = ?', [member.user.id]);
    }
  } catch (error) {
    console.error('Error checking vote status:', error);
  }
}

async function checkAllGuildMembers(client) {
  console.log('Checking vote status for all guild members...');

  client.guilds.cache.forEach(async (guild) => {
    console.log(`Checking guild: ${guild.name}`);

    guild.members.fetch().then(async (members) => {
      members.forEach(async (member) => {
        if (member.user.bot) {
          return;
        }

        await checkAndRecordUserVote(member);
      });
    });
  });

  setInterval(() => {
    console.log('Checking vote status for all guild members (every 30 minutes)...');
    client.guilds.cache.forEach(async (guild) => {
      guild.members.fetch().then(async (members) => {
        members.forEach(async (member) => {
          if (member.user.bot) {
            return;
          }

          await checkAndRecordUserVote(member);
        });
      });
    });
  }, 30 * 60 * 1000);
}

module.exports = {
  checkAndRecordUserVote,
  checkAllGuildMembers,
  sendRecurringReminders,
};
