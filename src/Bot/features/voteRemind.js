const axios = require('axios');
const mysql = require('mysql2');
const cron = require('node-cron');

// Configure MySQL connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Function to check if a user has voted
async function hasVoted(userId, botId, topGGToken) {
  try {
    const response = await axios.get(`https://top.gg/api/votes/${botId}/${userId}`, {
      headers: {
        Authorization: topGGToken,
      },
    });

    return response.data.voted === 1;
  } catch (error) {
    console.error('Error checking vote:', error);
    return false;
  }
}

// Function to handle sending reminder messages
async function sendVoteReminder(userId, botId, topGGToken) {
  const userHasVoted = await hasVoted(userId, botId, topGGToken);

  if (!userHasVoted) {
    console.log(`Reminder: User ${userId} has not voted yet.`);

    // Update the user's status in the MySQL database
    const [rows] = await pool.promise().query('SELECT * FROM users WHERE user_id = ?', [userId]);

    if (rows.length === 0) {
      // User does not exist, insert a new record
      await pool.promise().query('INSERT INTO users (user_id, voted) VALUES (?, ?)', [userId, 0]);
      console.log(`User ${userId} added to the database.`);
    } else {
      // User exists, update the record
      await pool.promise().query('UPDATE users SET voted = ? WHERE user_id = ?', [0, userId]);
      console.log(`User ${userId} updated in the database.`);
    }
  } else {
    console.log(`User ${userId} has voted.`);
  }
}

// Function to fetch guilds from Discord API and perform operations
async function processGuilds(botToken) {
  try {
    console.log('Fetching guilds from Discord API...');
    const response = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    const guilds = response.data;
    console.log(`Found ${guilds.length} guilds.`);

    for (const guild of guilds) {
      const guildId = guild.id;
      console.log(`Processing guild with ID: ${guildId}`);

      const response = await axios.get(`https://discord.com/api/v10/guilds/${guildId}/members`, {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      });

      const members = response.data;
      const userIds = members.map((member) => member.user.id);

      console.log(`Found ${userIds.length} members in the guild.`);

      for (const userId of userIds) {
        const [rows] = await pool.promise().query('SELECT * FROM users WHERE user_id = ?', [userId]);

        if (rows.length === 0) {
          // User does not exist, insert a new record
          await pool.promise().query('INSERT INTO users (user_id, voted) VALUES (?, ?)', [userId, 0]);
          console.log(`User ${userId} added to the database.`);
        }
      }
    }

    console.log('Guild processing complete.');
  } catch (error) {
    console.error('Error processing guilds:', error);
  }
}

// Function to fetch all users from the MySQL database
async function fetchAllUsersFromDatabase() {
  try {
    const [rows] = await pool.promise().query('SELECT user_id FROM users');
    const users = rows.map((row) => row.user_id);
    return users;
  } catch (error) {
    console.error('Error fetching users from database:', error);
    return [];
  }
}

// Set up a recurring reminder using node-cron
cron.schedule('0 12 * * *', async () => {
  try {
    console.log('Starting recurring reminders...');

    // Fetch guilds and process them
    await processGuilds(process.env.DISCORD_TOKEN);

    // Fetch all users from the database
    const users = await fetchAllUsersFromDatabase();
    console.log(`Found ${users.length} users in the database.`);

    // Send reminders to each user
    for (const userId of users) {
      console.log(`Sending reminder to user ${userId}`);
      sendVoteReminder(userId, process.env.BOT_ID, process.env.TOPGG_TOKEN);
    }

    console.log('Recurring reminders completed.');
  } catch (error) {
    console.error('Error sending reminders:', error);
  }
});

module.exports = {
  sendVoteReminder,
  hasVoted,
  processGuilds,
};
