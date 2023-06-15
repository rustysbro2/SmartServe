const axios = require('axios');
const mysql = require('mysql2/promise');

const botId = process.env.BOT_ID;
const topGGToken = process.env.TOPGG_TOKEN;

// MySQL connection settings
const connection = mysql.createPool({
  host: 'localhost',
  user: 'rustysbro',
  password: 'Dincas50@/',
  database: 'SmartBeta',
});

async function checkUserVote(guildId, userId) {
  try {
    const response = await axios.get(`https://top.gg/api/bots/${botId}/check`, {
      params: {
        userId: userId
      },
      headers: {
        Authorization: topGGToken
      }
    });

    const voted = response.data.voted === 1;

    // Update the 'voted' field in the database
    await updateVoteStatus(guildId, userId, voted);

    console.log(`API response for user ${userId} in guild ${guildId}:`, response.data); // Debug output

    return voted;
  } catch (error) {
    console.error(`Error checking vote status for user ${userId} in guild ${guildId}:`, error);
    return false;
  }
}

async function sendVoteReminder(guildId, userId, client) {
  try {
    // Replace with your custom logic to send a vote reminder message to the user in the specified guild
    console.log(`Sending vote reminder to user ${userId} in guild ${guildId}`);

    // Check if the user has already been reminded
    const query = 'SELECT reminded, voted FROM user_reminders WHERE guild_id = ? AND user_id = ?';
    const [rows] = await connection.query(query, [guildId, userId]);
    const { reminded, voted } = rows[0];

    if (reminded || !voted) {
      console.log(`User ${userId} has already been reminded or hasn't voted. Skipping reminder.`);
      return;
    }

    // Example: Send a DM to the user
    const user = await client.users.fetch(userId);
    if (user) {
      const voteLink = `https://top.gg/bot/${botId}/vote`;
      const reminderMessage = `Hey, don't forget to vote for our bot!\nVote here: ${voteLink}\nFrom: @cmdr_ricky`;

      // Update the 'reminded' field in the database before sending the reminder
      const updateQuery = 'UPDATE user_reminders SET reminded = 1 WHERE guild_id = ? AND user_id = ?';
      await connection.query(updateQuery, [guildId, userId]);

      user.send(reminderMessage);
    }
  } catch (error) {
    console.error(`Error sending vote reminder to user ${userId} in guild ${guildId}:`, error);
  }
}






async function updateVoteReminderOptOut(userId, optOutValue) {
  try {
    // Update the user's opt-out status in the database
    const query = 'UPDATE user_reminders SET opt_out = ? WHERE user_id = ?';
    await connection.query(query, [optOutValue, userId]);
  } catch (error) {
    console.error(`Error updating vote reminder opt-out status for user ${userId}:`, error);
  }
}

async function scheduleVoteReminders(client) {
  try {
    client.guilds.cache.each(async (guild) => {
      const guildId = guild.id;

      console.log(`Processing users in guild ${guildId}`);

      // Replace 'users' with your own logic to retrieve the list of users in the guild
      const users = await getUsers(client, guildId);

      for (const user of users) {
        const userId = user.id;

        console.log(`Processing user ${userId}`);

        // Check if the user already exists in the 'user_reminders' table
        const existingUser = await getUserReminder(guildId, userId);

        if (!existingUser) {
          console.log(`User ${userId} not found in database. Inserting user reminder.`);
          // Insert a new row for the user in the 'user_reminders' table
          await insertUserReminder(guildId, userId);
        } else if (existingUser.reminded) {
          console.log(`User ${userId} has already been reminded. Skipping reminder.`);
          continue; // Skip to the next user
        }

        // Only proceed if the user is not a bot
        if (!user.bot) {
          // Check if the user has voted
          console.log(`Checking vote status for user ${userId}`);
          const voted = await checkUserVote(guildId, userId);

          console.log(`User ${userId} vote status: ${voted}`);

          // Send the vote reminder if the user has not been reminded and has voted
          if (!existingUser.reminded && voted) {
            console.log(`Sending vote reminder to user ${userId}`);
            sendVoteReminder(guildId, userId, client);
            await updateReminderStatus(guildId, userId, true);
          }
        }
      }
    });
  } catch (error) {
    console.error('Error scheduling vote reminders:', error);
  }
}

async function getUsers(client, guildId) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      // Fetch all members in the guild
      const members = guild.members.cache;
      return members
        .filter((member) => !member.user.bot) // Exclude bot users
        .map((member) => ({
          id: member.user.id,
          username: member.user.username,
          bot: member.user.bot,
        }));
    }
    return [];
  } catch (error) {
    console.error(`Error retrieving users in guild ${guildId}:`, error);
    return [];
  }
}

async function getUsersRequiringVoteReminder(guildId) {
  try {
    const query = 'SELECT * FROM user_reminders WHERE guild_id = ?';
    const [rows] = await connection.query(query, [guildId]);
    return rows;
  } catch (error) {
    console.error(`Error retrieving users requiring vote reminders in guild ${guildId}:`, error);
    return [];
  }
}

async function getUserReminder(guildId, userId) {
  try {
    const query = 'SELECT * FROM user_reminders WHERE guild_id = ? AND user_id = ?';
    const [rows] = await connection.query(query, [guildId, userId]);
    return rows[0] || undefined; // Return the first row if found, or undefined if not found
  } catch (error) {
    console.error(`Error retrieving user reminder for user ${userId} in guild ${guildId}:`, error);
    return undefined;
  }
}

async function insertUserReminder(guildId, userId) {
  try {
    const query = 'INSERT INTO user_reminders (guild_id, user_id, reminded, opt_out, voted) VALUES (?, ?, ?, ?, ?)';
    await connection.query(query, [guildId, userId, false, false, false]);
    console.log(`Inserted user reminder for user ${userId} in guild ${guildId}`);
  } catch (error) {
    console.error(`Error inserting user reminder for user ${userId} in guild ${guildId}:`, error);
  }
}


async function updateReminderStatus(guildId, userId, reminded) {
  try {
    const query = 'UPDATE user_reminders SET reminded = ? WHERE guild_id = ? AND user_id = ?';
    await connection.query(query, [reminded, guildId, userId]);
  } catch (error) {
    console.error(`Error updating reminder status for user ${userId} in guild ${guildId}:`, error);
  }
}

async function updateVoteStatus(guildId, userId, voted) {
  try {
    // Update the 'voted' field in the database
    const query = 'UPDATE user_reminders SET voted = ? WHERE guild_id = ? AND user_id = ?';
    await connection.query(query, [voted, guildId, userId]);
  } catch (error) {
    console.error(`Error updating vote status for user ${userId} in guild ${guildId}:`, error);
  }
}

module.exports = {
  scheduleVoteReminders,
  updateVoteReminderOptOut,
  checkUserVote,
  sendVoteReminder,
  getUsersRequiringVoteReminder
};
