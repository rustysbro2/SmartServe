const pool = require('../database.js');
const { Client } = require('./bot');

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

async function processUsers(client) {
  try {
    const guilds = client.guilds.cache;

    for (const guild of guilds.values()) {
      await guild.members.fetch();

      for (const member of guild.members.cache.values()) {
        if (member.user.bot) {
          continue;
        }

        const [rows] = await pool.query('SELECT * FROM users WHERE discord_id = ?', [member.id]);

        if (rows.length === 0) {
          await addUserToDatabase(member.user);
        } else {
          const user = rows[0];

          if (!user.vote_timestamp) {
            await sendVoteReminder(member.user);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing users:', error);
  }
}

module.exports = {
  processUsers,
  addUserToDatabase,
  sendVoteReminder
};
