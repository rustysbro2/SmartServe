const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { handleStrike } = require('../features/strikeFeature');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Strike a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to strike')
        .setRequired(true)),

  async execute(interaction) {
    // Permission checks for the user
    const member = interaction.member;
    if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      await interaction.reply("You must have the 'Manage Server' permission to use this command.");
      return;
    }

    try {
      const targetUser = interaction.options.getUser('user');
      const targetUserId = targetUser.id;

      // Handle the strike
      await handleStrike(interaction, targetUserId);

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('User Striked')
        .setDescription(`${targetUser.tag} has been struck.`)
        .setThumbnail(targetUser.displayAvatarURL());

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error executing handleStrike:', error);
      await interaction.reply('An error occurred while handling the strike.');
    }
  },

  category: 'Strike',
  categoryDescription: 'Commands related to striking users',
};