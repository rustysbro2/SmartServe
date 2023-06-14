const axios = require('axios');
const pool = require('../../database.js');

const botId = process.env.BOT_ID;
const topGGToken = process.env.TOPGG_TOKEN;

async function remindUsersToVote(client) {
  try {
    console.log("Fetching guilds...");
    const guilds = client.guilds.cache;
    console.log("Fetched all guilds.");

    for (const [guildId, guild] of guilds) {
      console.log(`Fetching members for guild ${guildId}...`);
      const members = guild.members.cache;
      console.log(`Fetched members for guild ${guildId}.`);

      for (const [memberId, member] of members) {
        if (!member.user.bot) {
          console.log(`Checking vote status for user ${memberId}...`);
          const hasVoted = await checkUserVote(guildId, memberId);
          console.log(`User ${memberId} has voted: ${hasVoted}`);

          const optOut = await getVoteReminderOptOut(guildId, memberId);
          let initialReminderSent = await getInitialReminderSent(guildId, memberId);

          console.log(`Opt-out status for user ${memberId}: ${optOut}`);
          console.log(`Initial reminder sent flag for user ${memberId}: ${initialReminderSent}`);

          if (initialReminderSent === false) {
            // Send initial vote reminder
            const voteReminderMessage = `Reminder: Don't forget to vote for the bot! You can vote [here](https://top.gg/bot/${botId}/vote).`;
            console.log(`Sending initial vote reminder to user ${memberId}`);
            member.send(voteReminderMessage).catch(console.error);

            console.log(`Initial vote reminder sent to user ${memberId}`);
            // Update the initial reminder sent flag in the database
            await updateInitialReminderSent(guildId, memberId, true);
          } else if (!optOut && hasVoted && initialReminderSent === true) {
            // Send recurring vote reminder
            const recurringReminderMessage = `Reminder: You can vote for the bot [here](https://top.gg/bot/${botId}/vote) to support us.`;
            console.log(`Sending recurring vote reminder to user ${memberId}`);
            member.send(recurringReminderMessage).catch(console.error);

            console.log(`Recurring vote reminder sent to user ${memberId}`);
          }
        }
      }
    }

    console.log('Vote reminders sent successfully.');
  } catch (error) {
    console.error('Error sending vote reminders:', error);
  }
}

async function getInitialReminderSent(guildId, userId) {
  try {
    const [rows] = await pool.query('SELECT initial_reminder_sent FROM voted_users WHERE guild_id = ? AND discord_id = ?', [guildId, userId]);
    if (rows.length > 0) {
      return rows[0].initial_reminder_sent === 1;
    }
    return false;
  } catch (error) {
    console.error('Error retrieving initial reminder sent flag from the database:', error);
    throw error;
  }
}

async function updateInitialReminderSent(guildId, userId, initialReminderSent) {
  try {
    await pool.query('UPDATE voted_users SET initial_reminder_sent = ? WHERE guild_id = ? AND discord_id = ?', [initialReminderSent, guildId, userId]);
    console.log(`Initial reminder sent flag updated for user ${userId} in guild ${guildId}`);
  } catch (error) {
    console.error('Error updating initial reminder sent flag in the database:', error);
    throw error;
  }
}

async function getLastRemindTime(guildId, userId) {
  try {
    const [rows] = await pool.query('SELECT last_remind_time FROM voted_users WHERE guild_id = ? AND discord_id = ?', [guildId, userId]);
    if (rows.length > 0) {
      return rows[0].last_remind_time;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving last remind time from the database:', error);
    throw error;
  }
}

async function updateLastRemindTime(guildId, userId, lastRemindTime) {
  try {
    await pool.query('UPDATE voted_users SET last_remind_time = ? WHERE guild_id = ? AND discord_id = ?', [lastRemindTime, guildId, userId]);
    console.log(`Last remind time updated for user ${userId} in guild ${guildId}`);
  } catch (error) {
    console.error('Error updating last remind time in the database:', error);
    throw error;
  }
}

async function createNewRow(guildId, userId, lastRemindTime) {
  try {
    await pool.query('INSERT INTO voted_users (guild_id, discord_id, last_remind_time) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE last_remind_time = VALUES(last_remind_time)', [guildId, userId, lastRemindTime]);
    console.log(`New row created or updated for user ${userId} in guild ${guildId}`);
  } catch (error) {
    console.error('Error creating new row in the database:', error);
    throw error;
  }
}

async function checkUserVote(guildId, userId) {
  try {
    const response = await axios.get(`https://top.gg/api/bots/${botId}/check?userId=${userId}`, {
      headers: {
        Authorization: topGGToken,
      },
    });

    return response.data.voted === 1;
  } catch (error) {
    console.error('Error checking user vote:', error);
    return false;
  }
}

async function getVoteReminderOptOut(guildId, userId) {
  try {
    const [rows] = await pool.query('SELECT opt_out FROM voted_users WHERE guild_id = ? AND discord_id = ?', [guildId, userId]);

    // Check if rows are returned and if they are not undefined
    if (rows && rows.length > 0) {
      return rows[0].opt_out === 1;
    } else {
      // If there is no record for the user, create a new row with default opt-out status (false)
      const defaultOptOutStatus = 0; // assuming opt-out is false by default
      const defaultLastRemindTime = new Date();
      await createNewRow(guildId, userId, defaultLastRemindTime);
      await updateVoteReminderOptOut(guildId, userId, defaultOptOutStatus);

      // Return default opt-out status
      return defaultOptOutStatus === 1;
    }
  } catch (error) {
    console.error('Error retrieving vote reminder opt-out status from the database:', error);
    throw error;
  }
}

async function updateVoteReminderOptOut(guildId, userId, optOut) {
  try {
    await pool.query('INSERT INTO voted_users (guild_id, discord_id, opt_out) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE opt_out = ?', [guildId, userId, optOut, optOut]);
    console.log(`Vote reminder opt-out status updated for user ${userId} in guild ${guildId}`);
  } catch (error) {
    console.error('Error updating vote reminder opt-out status in the database:', error);
    throw error;
  }
}

module.exports = {
  remindUsersToVote,
  getLastRemindTime,
  updateLastRemindTime,
  createNewRow,
  checkUserVote,
  getVoteReminderOptOut,
  updateVoteReminderOptOut,
  getInitialReminderSent,
  updateInitialReminderSent
};
