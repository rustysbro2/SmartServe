require('dotenv').config();
const axios = require('axios');
const pool = require('../../database.js');
const { client } = require('../bot.js'); // Assuming your bot instance is exported as 'client'

const clientId = process.env.CLIENT_ID;
const topGGToken = process.env.TOP_GG_TOKEN;

async function remindUsersToVote() {
  try {
    const { data: botStats } = await axios.get(`https://top.gg/api/bots/${clientId}/stats`, {
      headers: {
        Authorization: topGGToken,
      },
    });

    const guildCount = botStats.server_count || 0;

    const voteReminderMessage = `Reminder: Don't forget to vote for the bot! You can vote [here](https://top.gg/bot/${clientId}/vote).`;

    // Get the list of all guild members
    const guildMembers = await getGuildMembers();

    for (const member of guildMembers) {
      const memberId = member.user.id;

      // Check if the member has voted and it has been more than 12 hours since their last vote
      const lastVoteTime = await getMemberLastVoteTime(memberId);
      const timeSinceLastVote = lastVoteTime ? Date.now() - lastVoteTime.getTime() : Infinity;

      if (!member.user.bot && (timeSinceLastVote >= 12 * 60 * 60 * 1000)) {
        // Schedule the vote reminder for the member 12 hours after their last vote
        scheduleVoteReminder(member, voteReminderMessage, lastVoteTime);
      }
    }

    console.log('Vote reminders scheduled successfully.');
  } catch (error) {
    console.error('Error scheduling vote reminders:', error);
  }
}

async function getGuildMembers() {
  try {
    const guilds = await client.guilds.fetch();
    const guildMembers = [];

    for (const guild of guilds.values()) {
      const members = await guild.members.fetch();
      guildMembers.push(...members.values());
    }

    return guildMembers;
  } catch (error) {
    console.error('Error fetching guild members:', error);
  }

  return [];
}

async function getMemberLastVoteTime(memberId) {
  try {
    const [rows] = await pool.promise().query('SELECT last_vote_time FROM voted_users WHERE discord_id = ?', [memberId]);

    if (rows.length > 0) {
      const { last_vote_time } = rows[0];
      return last_vote_time;
    }
  } catch (error) {
    console.error('Error fetching member last vote time:', error);
  }

  return null;
}

async function updateMemberLastVoteTime(memberId, voteTime) {
  try {
    await pool.promise().query('INSERT INTO voted_users (discord_id, last_vote_time) VALUES (?, ?) ON DUPLICATE KEY UPDATE last_vote_time = ?', [memberId, voteTime, voteTime]);
  } catch (error) {
    console.error('Error updating member last vote time:', error);
  }
}

async function scheduleVoteReminder(member, message, lastVoteTime) {
  const reminderDelay = 12 * 60 * 60 * 1000; // Delay of 12 hours
  const reminderTime = lastVoteTime.getTime() + reminderDelay;

  setTimeout(() => {
    member.send(message).catch(console.error);

    console.log(`Vote reminder sent to user ${member.id}`);
  }, reminderTime - Date.now());
}

module.exports = {
  remindUsersToVote,
};
