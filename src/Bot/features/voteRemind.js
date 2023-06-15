const axios = require('axios');
const mysql = require('mysql2/promise');
const cron = require('node-cron');
require('dotenv').config(); // Import dotenv and load environment variables

const botId = process.env.BOT_ID;
const topGGToken = process.env.TOPGG_TOKEN;

// MySQL connection settings
const connection = mysql.createPool({
  host: 'localhost',
  user: 'rustysbro',
  password: 'Dincas50@/',
  database: 'SmartBeta',
});

async function sendReminder(member) {
  console.log(`Sending reminder to user: ${member.user.tag}`);
  member.send("Don't forget to vote for the bot! Your support is appreciated!");

  // Set reminder_sent to 1 in the database to mark that a reminder has been sent
  await connection.query('UPDATE vote_reminders SET reminder_sent = 1 WHERE user_id = ?', [member.user.id]);
}

async function checkUserVote(client) {
  try {
    console.log('Starting user vote check...');

    const remindersToSend = [];

    client.guilds.cache.forEach(async (guild) => {
      console.log(`Checking guild: ${guild.name}`);

      guild.members.cache.forEach(async (member) => {
        // Skip if the member is a bot
        if (member.user.bot) {
          return;
        }

        console.log(`Checking member: ${member.user.tag}`);

        // Check if the user has already received the initial reminder
        const [rows] = await connection.query('SELECT * FROM vote_reminders WHERE user_id = ?', [member.user.id]);

        if (rows.length === 0) {
          // User has not received the initial reminder, send it
          console.log(`Sending initial reminder to user: ${member.user.tag}`);
          member.send("Thanks for using our bot! Don't forget to vote for us on top.gg!");

          // Store the user in the database and set reminder_sent to 1 to track the initial reminder
          await connection.query('INSERT INTO vote_reminders (user_id, reminder_sent) VALUES (?, 1)', [member.user.id]);

          // Skip checking vote status for this user since it's the initial reminder
          return;
        }

        const { reminder_sent, voted } = rows[0];

        if (reminder_sent === 0) {
          // User has not received a reminder yet
          if (voted === 0) {
            // User has not voted, add the member to the reminders to send
            remindersToSend.push(member);
          } else {
            // User has voted, set reminder_sent to 1 in the database to mark that a reminder has been sent
            await connection.query('UPDATE vote_reminders SET reminder_sent = 1 WHERE user_id = ?', [member.user.id]);
          }
        }

        // Skip checking vote status for this user since it's a reminder
        if (reminder_sent === 1) {
          return;
        }

        // Check if the user has voted
        const response = await axios.get(`https://top.gg/api/bots/${botId}/check`, {
          params: {
            userId: member.user.id
          },
          headers: {
            Authorization: topGGToken
          }
        });

        if (response.data.voted === 1) {
          console.log(`User ${member.user.tag} has voted.`);
          // Update voted field in the database
          await connection.query('UPDATE vote_reminders SET voted = 1 WHERE user_id = ?', [member.user.id]);
        } else {
          console.log(`User ${member.user.tag} has not voted.`);
        }
      });
    });

    console.log('User vote check completed.');

    return remindersToSend;
  } catch (error) {
    console.error('Error checking user votes:', error);
    return [];
  }
}

module.exports = {
  checkUserVote,
  sendReminder
};
