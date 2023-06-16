const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

const botId = process.env.BOT_ID;
const topGGToken = process.env.TOPGG_TOKEN;
const supportServerLink = 'https://discord.gg/wtzp28pHRK';
const topGGVoteLink = `https://top.gg/bot/${botId}/vote`;
const ownerUserId = '385324994533654530';

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
  const [users] = await connection.query(
    'SELECT user_id, voted, last_vote_time, recurring_remind_time FROM users WHERE initial_reminder_sent = 1'
  );

  const currentTime = Date.now();

  const recurringReminderPromises = users.map(async (row) => {
    const lastVoteTime = row.last_vote_time ? new Date(row.last_vote_time).getTime() : new Date(0).getTime();
    const recurringReminderTime = row.recurring_remind_time ? new Date(row.recurring_remind_time).getTime() : new Date(0).getTime();

    if (row.user_id) {
      const user = await client.users.fetch(row.user_id);
      const [[userData]] = await connection.query('SELECT * FROM users WHERE user_id = ?', [row.user_id]);

      if (userData.opt_out !== 1) {
        let message;

        // If the user has voted before and it's been more than 12 hours since their last vote
        if (row.voted === 1 && currentTime - lastVoteTime >= 12 * 60 * 60 * 1000) {
          message = `Hello! It's been 12 hours since your last vote. Please consider voting for our bot again by visiting the vote link: ${topGGVoteLink}\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;
        }
        // If the user has not voted and it's been more than 24 hours since their last reminder
        else if (row.voted === 0 && currentTime - recurringReminderTime >= 24 * 60 * 60 * 1000) {
          message = `Hello! It's been 24 hours since your last reminder. Please consider voting for our bot by visiting the vote link: ${topGGVoteLink}\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;
        }

        if (message) {
          const owner = await client.users.fetch(ownerUserId);
          message += ` The owner of the bot is ${owner}.`;
          sendDM(user, message);
          await connection.query('UPDATE users SET recurring_remind_time = ? WHERE user_id = ?', [new Date(), row.user_id]);
        }
      }
    }
  });

  await Promise.all(recurringReminderPromises);
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
      'INSERT INTO users (user_id, voted, last_vote_time, initial_reminder_sent, opt_out) VALUES (?, ?, ?, 0, 0) ON DUPLICATE KEY UPDATE voted = VALUES(voted), last_vote_time = IF(VALUES(voted) = 1, VALUES(last_vote_time), last_vote_time), initial_reminder_sent = initial_reminder_sent',
      [member.user.id, voteStatus, new Date()]
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
  console.log('Checking vote status for all guild members at startup...');

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

  console.log('Sending recurring reminders at startup...');
  sendRecurringReminders(client);

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

    console.log('Sending recurring reminders...');
    sendRecurringReminders(client);
  }, 30 * 60 * 1000);
}

module.exports = {
  checkAndRecordUserVote,
  checkAllGuildMembers,
  sendRecurringReminders,
};
