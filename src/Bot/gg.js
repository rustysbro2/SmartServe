const pool = require('../database.js');
const { client } = require('./bot.js');

async function addUserToDatabase(user) {
  try {
    const insertQuery = 'INSERT INTO users (discord_id, vote_timestamp, reminder_sent, opt_out_status) VALUES (?, NULL, 0, 0)';
    await pool.query(insertQuery, [user.id]);

    console.log(`Added user with Discord ID ${user.id} to the database.`);
  } catch (error) {
    console.error(`Error adding user with Discord ID ${user.id} to the database:`, error);
  }
}

async function sendVoteReminder(user) {
  try {
    await user.send('Reminder: Don\'t forget to vote!');
    console.log(`Vote reminder sent to user with Discord ID ${user.id}`);
  } catch (error) {
    console.error(`Error sending vote reminder to user with Discord ID ${user.id}:`, error);
  }
}

async function processUsers() {
  try {
    // Iterate over every guild the bot is a member of
    for (const guild of client.guilds.cache.values()) {
      // Fetch all members from the guild
      await guild.members.fetch();

      // Iterate over every member in the guild
      for (const member of guild.members.cache.values()) {
        // Skip if the member is a bot
        if (member.user.bot) {
          continue;
        }

        // Check if the user is already in the database
        const [rows] = await pool.query('SELECT * FROM users WHERE discord_id = ?', [member.id]);

        if (rows.length === 0) {
          // User is not in the database, add them
          await addUserToDatabase(member.user);
        } else {
          // User is in the database, check if they have voted
          const user = rows[0];

          if (!user.vote_timestamp) {
            // User has not voted, send them a reminder
            await sendVoteReminder(member.user);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing users:', error);
  }
}

// Call the processUsers function when the bot is ready
client.once('ready', () => {
  processUsers();
});

// Handle guildCreate event to process new guild members
client.on('guildCreate', (guild) => {
  processUsers();
});

// Handle guildMemberAdd event to process new members in existing guilds
client.on('guildMemberAdd', (member) => {
  // Skip if the member is a bot
  if (member.user.bot) {
    return;
  }

  // Check if the user is already in the database
  pool.query('SELECT * FROM users WHERE discord_id = ?', [member.id], (error, [rows]) => {
    if (error) {
      console.error(`Error retrieving user with Discord ID ${member.id} from the database:`, error);
      return;
    }

    if (rows.length === 0) {
      // User is not in the database, add them
      addUserToDatabase(member.user);
    } else {
      // User is in the database, check if they have voted
      const user = rows[0];

      if (!user.vote_timestamp) {
        // User has not voted, send them a reminder
        sendVoteReminder(member.user);
      }
    }
  });
});

// Export the functions
module.exports = {
  processUsers,
  addUserToDatabase,
  sendVoteReminder
};
