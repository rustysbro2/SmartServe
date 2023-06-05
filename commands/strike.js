const { SlashCommandBuilder } = require('discord.js');
const { logStrike } = require('../features/strikeFeature');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Log a strike for a user')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to strike')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('The reason for the strike')
        .setRequired(true) // Make the reason option optional
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id; // Use interaction.guild.id instead of interaction.guildId
    const user = interaction.options.getUser('user');
    let reason = interaction.options.getString('reason');

    // Check if reason is null and provide a default value
    if (!reason) {
      reason = 'No reason provided';
    }

    try {
      await logStrike(guildId, user.id, reason);
      await interaction.reply(`Strike logged for user <@${user.id}>. Reason: ${reason}`);
    } catch (error) {
      console.error('Error logging strike:', error);
      await interaction.reply('An error occurred while logging the strike.');
    }
  },
};
