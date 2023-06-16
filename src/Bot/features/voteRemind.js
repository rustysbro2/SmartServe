const mysql = require('mysql2/promise');
const axios = require('axios');
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
        userId: member.user.id
      },
      headers: {
        Authorization: topGGToken
      }
    });

    const voteStatus = response.data.voted;

    // Update the vote status in the database
    const [results] = await connection.query('INSERT INTO users (user_id, voted, initial_reminder_sent) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE voted = VALUES(voted), initial_reminder_sent = initial_reminder_sent', [member.user.id, voteStatus]);

    console.log(`User ${member.user.tag} has ${voteStatus === 1 ? '' : 'not '}voted.`);

    // If the user hasn't voted and the initial reminder hasn't been sent yet, send it.
    const [[user]] = await connection.query('SELECT * FROM users WHERE user_id = ?', [member.user.id]);
    if (user.voted === 0 && user.initial_reminder_sent === 0) {
      // Send an initial reminder DM
      sendDM(member.user, "Hello! It seems you haven't voted yet. Please consider voting for our bot!");
      // Update the initial_reminder_sent flag in the database
      await connection.query('UPDATE users SET initial_reminder_sent = 1 WHERE user_id = ?', [member.user.id]);
    }
  } catch (error) {
    console.error('Error checking vote status:', error);
  }
}





async function sendRecurringReminders(client) {
  // Select users who have never voted and 12 hours have passed since the initial reminder
  const [neverVotedRows] = await connection.query(
    'SELECT user_id, initial_reminder_time FROM users WHERE voted = 0 AND initial_reminder_sent = 1'
  );
  
  for (const row of neverVotedRows) {
    // Check if 12 hours have passed since the initial reminder
    if (Date.now() - row.initial_reminder_time.getTime() >= 12 * 60 * 60 * 1000) {
      const user = await client.users.fetch(row.user_id);
      sendDM(user, "Hello! It seems you haven't voted yet. Please consider voting for our bot!");
    }
  }

  // Select users who have voted and 12 hours have passed since the last vote
  const [votedRows] = await connection.query(
    'SELECT user_id FROM users WHERE voted = 1 AND TIMESTAMPDIFF(HOUR, last_vote_time, NOW()) >= 12'
  );

  for (const row of votedRows) {
    const user = await client.users.fetch(row.user_id);
    sendDM(user, "Hello! It's time to vote for our bot again. Thank you for your support!");
  }
}

async function checkAllGuildMembers(client) {
  client.guilds.cache.forEach(async (guild) => {
    console.log(`Checking guild: ${guild.name}`);

    guild.members.fetch().then(async (members) => {
      members.forEach(async (member) => {
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
