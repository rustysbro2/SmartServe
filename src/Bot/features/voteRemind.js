const axios = require('axios');
const pool = require('../../database.js');

const botId = process.env.BOT_ID;
const topGGToken = process.env.TOP_GG_TOKEN;

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

          if (!hasVoted) {
            // Send vote reminder
            const voteReminderMessage = `Reminder: Don't forget to vote for the bot! You can vote [here](https://top.gg/bot/${botId}/vote).`;
            console.log(`Sending vote reminder to user ${memberId}`);
            member.send(voteReminderMessage).catch(console.error);

            console.log(`Vote reminder sent to user ${memberId}`);
          }
        }
      }
    }

    console.log('Vote reminders sent successfully.');
  } catch (error) {
    console.error('Error sending vote reminders:', error);
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

module.exports = {
  remindUsersToVote,
};
