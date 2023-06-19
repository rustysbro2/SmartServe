// voteRemind.js
const path = require('path');
const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connection } = require('../../database.js');

const botId = process.env.BOT_ID;
const topGGToken = process.env.TOPGG_TOKEN;
const supportServerLink = 'https://discord.gg/wtzp28pHRK';
const topGGVoteLink = `https://top.gg/bot/${botId}/vote`;
const ownerUserId = '385324994533654530';
const webhookPort = 3006; // Replace with your desired webhook port


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

        if (currentTime - recurringReminderTime >= 12 * 60 * 60 * 1000) {
          message = `Hello! It's been 12 hours since your last vote. Please consider voting for our bot again by visiting the vote link: ${topGGVoteLink}\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;
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

let checkedUsers = new Set();

async function checkAndRecordUserVote(member) {
  console.log(`Checking vote status for user: ${member.user}`);

  // If this user's vote status has been checked in this session, exit the function
  if (checkedUsers.has(member.user.id)) {
    return;
  }
  // Add the user to the set of checked users
  checkedUsers.add(member.user.id);

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

    // Fetch current user data from the database
    const [currentUserDataRows] = await connection.query('SELECT * FROM users WHERE user_id = ?', [member.user.id]);

    let currentUserData;
    if (currentUserDataRows.length > 0) {
      currentUserData = currentUserDataRows[0];
    } else {
      currentUserData = {
        user_id: member.user.id,
        voted: 0,
        last_vote_time: null,
        initial_reminder_sent: 0,
        opt_out: 1,  // Default opt_out to 1
        previous_vote_status: 0
      };
    }

    await connection.query(
      'INSERT INTO users (user_id, voted, last_vote_time, initial_reminder_sent, opt_out, previous_vote_status) VALUES (?, ?, ?, 0, 1, ?) ON DUPLICATE KEY UPDATE voted = ?, last_vote_time = IF(? = 1, NOW(), last_vote_time), recurring_remind_time = IF(? = 1, NOW(), recurring_remind_time), initial_reminder_sent = initial_reminder_sent, previous_vote_status = ?',
      [member.user.id, voteStatus, new Date(), currentUserData.previous_vote_status, voteStatus, voteStatus, voteStatus, currentUserData.previous_vote_status]
    );

    console.log(`User ${member.user.tag} has ${voteStatus === 1 ? '' : 'not '}voted.`);

    // If voted status changes from 1 to 0 and user did not opt out, send a reminder immediately
    if (currentUserData.voted === 1 && voteStatus === 0 && currentUserData.opt_out === 0) {
      let message = `Hello, ${member.user}! It seems you have not voted recently. Please consider voting for our bot by visiting the vote link: ${topGGVoteLink}\n\nThe owner of the bot is <@${ownerUserId}>.`;

      message += `\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;

      sendDM(member.user, message);
    }
    
    const [[user]] = await connection.query('SELECT * FROM users WHERE user_id = ?', [member.user.id]);
    if (user.initial_reminder_sent === 0) {
      let message = `Hello, ${member.user}! It seems you haven't voted yet. Please consider voting for our bot by visiting the vote link: ${topGGVoteLink}\n\nYou won't receive further reminders unless you opt in to reminders.\n\nThe owner of the bot is <@${ownerUserId}>.`;

      message += `\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;

      sendDM(member.user, message);

      await connection.query('UPDATE users SET initial_reminder_sent = 1 WHERE user_id = ?', [member.user.id]);
    }
  } catch (error) {
    console.error('Error checking vote status:', error);
  }
}


async function handleVoteWebhook(req, res, client) {
  console.log('Received vote webhook:', req.body);

  const { user } = req.body;
  console.log('user:', user);

  if (!user) {
    console.error('Invalid vote webhook request. Missing user ID.');
    return res.sendStatus(400);
  }

  console.log(`Received vote webhook for user: ${user}`);

  const member = await client.guilds.cache
    .map((guild) => guild.members.fetch(user))
    .find((member) => member);

  console.log('Member:', member);

  if (!member) {
    console.error(`Member not found for user ID: ${user}`);
    return res.sendStatus(404);
  }

  try {
    await checkAndRecordUserVote(member);
    console.log(`Vote status checked and recorded for user: ${member.user.tag}`);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error checking vote status:', error);
    res.sendStatus(500);
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
    console.log('Checking vote status for all guild members (every 5 minutes)...');
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
  }, 5 * 60 * 1000);
}


module.exports = {
  checkAndRecordUserVote,
  checkAllGuildMembers,
  sendRecurringReminders,
  handleVoteWebhook,
};