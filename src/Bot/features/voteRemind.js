// voteRemind.js

const path = require('path');
const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connection } = require('../../database.js');

const botId = process.env.BOT_ID;
const topGGToken = process.env.TOPGG_TOKEN;
const supportServerLink = 'https://discord.gg/wtzp28pHRK';
const topGGVoteLink = `https://top.gg/bot/1105598736551387247/vote`;
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
    'SELECT user_id, voted, last_vote_time, recurring_remind_time, opt_out FROM users WHERE opt_out = 0'
  );

  const currentTime = Date.now();

  const recurringReminderPromises = users.map(async (row) => {
    if (row.opt_out === 0) {
      const lastVoteTime = row.last_vote_time ? new Date(row.last_vote_time).getTime() : new Date(0).getTime();
      const recurringReminderTime = row.recurring_remind_time ? new Date(row.recurring_remind_time).getTime() : new Date(0).getTime();

      const user = await client.users.fetch(row.user_id);
      const [[userData]] = await connection.query('SELECT * FROM users WHERE user_id = ?', [row.user_id]);

      let message;

      if (userData.voted === 0 && (currentTime - recurringReminderTime >= 12 * 60 * 60 * 1000)) {
        message = `Hello! It's been 12 hours since your last vote. Please consider voting for our bot again by visiting the vote link: ${topGGVoteLink}\n\nThe owner of the bot is <@${ownerUserId}>.\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;
      }

      if (message) {
        const owner = await client.users.fetch(ownerUserId);
        message += ` The owner of the bot is ${owner}.`;
        sendDM(user, message);
        await connection.query('UPDATE users SET recurring_remind_time = ? WHERE user_id = ?', [new Date(), row.user_id]);
      }
    }
  });

  await Promise.all(recurringReminderPromises);
}

async function checkAndRecordUserVote(member) {
  console.log(`Checking vote status for user: ${member.user}`);

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

    // Check if the user exists in the table
    const [[existingUser]] = await connection.query('SELECT * FROM users WHERE user_id = ?', [member.user.id]);

    if (existingUser) {
      // User exists in the table, update the vote status and previous vote status
      const currentVoteStatus = existingUser.voted;
      const previousVoteStatus = existingUser.previous_vote_status;

      await connection.query(
        'UPDATE users SET voted = ?, previous_vote_status = ? WHERE user_id = ?',
        [voteStatus, currentVoteStatus, member.user.id]
      );

      console.log(`User ${member.user.tag} has ${voteStatus === 1 ? '' : 'not '}voted.`);

      // Check if the vote status has changed
      if (voteStatus !== currentVoteStatus) {
        // Vote status has changed, update the previous_vote_status column
        console.log('Vote status has changed.');

        if (voteStatus === 0) {
          // Send a reminder if the user has not voted
          const user = member.user;
          const message = `Hello! It seems you haven't voted yet. Please consider voting for our bot by visiting the vote link: ${topGGVoteLink}\n\nThe owner of the bot is <@${ownerUserId}>.\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;
          sendDM(user, message);

          // Update recurring_remind_time to current time
          await connection.query('UPDATE users SET recurring_remind_time = ? WHERE user_id = ?', [new Date(), member.user.id]);
        }

        // Perform any other actions or logic based on the vote status change
      }
    } else {
      // User does not exist in the table, insert a new row with their information
      await connection.query(
        'INSERT INTO users (user_id, voted, last_vote_time, previous_vote_status, recurring_remind_time, opt_out) VALUES (?, ?, ?, ?, ?, 1)',
        [member.user.id, voteStatus, new Date(), voteStatus, new Date()]
      );

      console.log(`User ${member.user.tag} has been added to the table.`);
    }
  } catch (error) {
    console.error('Error checking vote status:', error);
  }
}

async function handleVoteWebhook(req, res, client) {
  console.log('Received vote webhook:', req.body);

  const { user } = req.body;
  console.log('User:', user);

  if (!user) {
    console.error('Invalid vote webhook request. Missing user ID.');
    return res.sendStatus(400);
  }

  console.log(`Received vote webhook for user: ${user}`);

  const guilds = client.guilds.cache.filter((guild) => guild.members.cache.has(user));

  if (guilds.size === 0) {
    console.error(`Member not found in any guild for user ID: ${user}`);
    return res.sendStatus(404);
  }

  try {
    for (const [, guild] of guilds) {
      const member = await guild.members.fetch(user);

      if (member) {
        await checkAndRecordUserVote(member);
        console.log(`Vote status checked and recorded for user: ${member.user.tag}`);
        break;
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error checking vote status:', error);
    res.sendStatus(500);
  }
}



async function checkAllGuildMembers(client) {
  console.log('Checking vote status for all guild members at startup...');

  const checkedUsers = new Set(); // Track checked users

  async function processMember(member) {
    if (member.user.bot || checkedUsers.has(member.user.id)) {
      return; // Skip bots and already checked users
    }

    checkedUsers.add(member.user.id); // Add user to checked set

    const [[userData]] = await connection.query('SELECT * FROM users WHERE user_id = ?', [member.user.id]);

    if (userData) {
      // User is found in the database
      if (userData.opt_out === 0) {
        await checkAndRecordUserVote(member);
      }
    } else {
      // User is not found in the database
      await checkAndRecordUserVote(member);
    }
  }

  async function processGuild(guild) {
    try {
      const members = await guild.members.fetch();

      for (const [, member] of members) {
        await processMember(member);
      }
    } catch (error) {
      console.error('Error fetching guild members:', error);
    }
  }

  async function processAllGuilds() {
    for (const [, guild] of client.guilds.cache) {
      await processGuild(guild);
    }
  }

  await processAllGuilds();

  console.log('Sending recurring reminders at startup...');
  sendRecurringReminders(client);

  setInterval(async () => {
    console.log('Checking vote status for all guild members (every 5 minutes)...');
    checkedUsers.clear(); // Clear the checked users set

    await processAllGuilds();

    console.log('Sending recurring reminders...');
    sendRecurringReminders(client);
  }, 1 * 30 * 1000); // Interval set to 5 minutes (5 * 60 * 1000 milliseconds)
}






module.exports = {
  checkAndRecordUserVote,
  checkAllGuildMembers,
  sendRecurringReminders,
  handleVoteWebhook,
};
