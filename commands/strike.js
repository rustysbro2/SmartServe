const { logStrike } = require('../strikeFeature');

async function execute(interaction, pool) {
  const guildId = interaction.guildId;
  const userId = interaction.options.getUser('user').id;
  const reason = interaction.options.getString('reason');

  try {
    await logStrike(pool, guildId, userId, reason);
    await interaction.reply(`Strike logged for user <@${userId}>. Reason: ${reason}`);
  } catch (error) {
    console.error('Error logging strike:', error);
    await interaction.reply('An error occurred while logging the strike.');
  }
}

module.exports = {
  data: {
    name: 'strike',
    description: 'Log a strike for a user',
    options: [
      {
        name: 'user',
        description: 'The user to strike',
        type: 'USER',
        required: true,
      },
      {
        name: 'reason',
        description: 'The reason for the strike',
        type: 'STRING',
        required: true,
      },
    ],
  },
  execute,
};
