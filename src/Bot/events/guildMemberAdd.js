const { checkAndRecordUserVote } = require('../features/voteRemind');

async function guildMemberAddEvent(member, client) {
  try {
    if (member.user.bot) {
      return;
    }

    await checkAndRecordUserVote(member);
  } catch (error) {
    console.error('Error handling guildMemberAdd event:', error);
  }
}

module.exports = {
  guildMemberAddEvent,
};
