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

    // Get user from the database
    const [rows] = await connection.query('SELECT * FROM users WHERE user_id = ?', [member.user.id]);
    const user = rows[0];

    // If the user doesn't exist in the database, it's a new user
    if (!user) {
      // Send initial reminder
      member.send('This is your initial reminder! Please remember to vote for our bot. Thank you!')
        .catch(error => {
          console.error(`Could not send DM to ${member.user.tag}.`);
        });
    }

    // Update the vote status in the database
    await connection.query('INSERT INTO users (user_id, voted) VALUES (?, ?) ON DUPLICATE KEY UPDATE voted = ?', [member.user.id, voteStatus, voteStatus]);

    console.log(`User ${member.user.tag} has ${voteStatus === 1 ? '' : 'not '}voted.`);

  } catch (error) {
    console.error('Error checking vote status:', error);
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
}

module.exports = {
  checkAndRecordUserVote,
  checkAllGuildMembers
};
