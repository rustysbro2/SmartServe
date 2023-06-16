const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

const botId = process.env.BOT_ID;
const topGGToken = process.env.TOPGG_TOKEN;
const supportServerLink = 'https://discord.gg/wtzp28pHRK';
const topGGVoteLink = `https://top.gg/bot/${botId}/vote`;

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
      let message = `Hello, ${member.user}! It seems you haven't voted yet. Please consider voting for our bot by visiting the vote link: ${topGGVoteLink}\n\nYou won't receive further reminders unless you opt in to reminders.`;
      message += ` The owner of the bot is <@385324994533654530>.`;
      message += `\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;

      sendDM(member.user, message);

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

    const nextReminderTime = Math.ceil(recurringReminderTime / (12 * 60 * 60 * 1000)) * (12 * 60 * 60 * 1000);
    const delay = nextReminderTime - currentTime;

    if (currentTime >= nextReminderTime) {
      const discordUser = await client.users.fetch(user.user_id);
      const message = `Hello! It seems you haven't voted yet. Please consider voting for our bot by visiting the vote link: ${topGGVoteLink}\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;
      sendDM(discordUser, message);

      await connection.query('UPDATE users SET recurring_remind_time = ? WHERE user_id = ?', [new Date(), user.user_id]);
    } else {
      setTimeout(() => {
        sendRecurringReminders(client);
      }, delay);
    }
  });
}

async function checkAllGuildMembers(client) {
  client.guilds.cache.forEach(async guild => {
    console.log(`Checking guild: ${guild.name}`);

    guild.members.fetch().then(async members => {
      members.forEach(async member => {
        if (member.user.bot) {
          return;
        }

        await checkAndRecordUserVote(member);
      });
    });
  });

  await sendRecurringReminders(client);

  setInterval(() => {
    sendRecurringReminders(client);
  }, 12 * 60 * 60 * 1000);
}

module.exports = {
  checkAndRecordUserVote,
  checkAllGuildMembers,
};
