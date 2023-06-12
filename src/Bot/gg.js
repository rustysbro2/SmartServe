// Import the client object from bot.js
const { client } = require('./bot');

// Move the processUsers function outside the 'ready' event block
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

// Call the processUsers function immediately
processUsers();

// Export the processUsers function
module.exports = {
  processUsers,
  addUserToDatabase,
  sendVoteReminder
};
