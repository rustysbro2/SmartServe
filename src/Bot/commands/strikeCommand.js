const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { handleStrike, addStrikeReason } = require('../features/strikeFeature');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Strike a user')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to strike').setRequired(true))
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the strike').setRequired(false)),

  async execute(interaction) {
    const targetUserId = interaction.options.get('user')?.user.id;
    if (!targetUserId) {
      await interaction.reply('Invalid user provided.');
      return;
    }

    const reason = interaction.options.getString('reason'); // Get the reason option value

    try {
      // Ensure the strike reason exists in the database
      if (reason) {
        await addStrikeReason(reason);
      }

      // Handle the strike with the reason
      await handleStrike(interaction, interaction.client, targetUserId, reason);

      const targetUser = interaction.options.get('user').user;
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('User Striked')
        .setDescription(`${targetUser.tag} has been struck.\nReason: ${reason || 'No reason provided'}`)
        .setThumbnail(targetUser.displayAvatarURL());

      await interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (error) {
      console.error('Error executing handleStrike:', error);
      await interaction.reply('An error occurred while handling the strike.');
    }
  },

  category: 'Strike',
  categoryDescription: 'Commands related to striking users',
};
