const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const inviteTracker = require('../features/inviteTracker.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setinvitechannel')
    .setDescription('Set the channel for invite tracking messages')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send messages in')
        .setRequired(true)),
  async execute(interaction) {
    try {
      // Check if the interaction has guild data
      if (!interaction.guild) {
        await interaction.reply('This command can only be used in a server (guild).');
        return;
      }

      // Permission checks for the user
      if (member.premissions.has(PermissionsBitField.FLAGS.MANAGE_GUILD)) {
        await interaction.reply('You do not have permission to use this command.');
        return;
      }

      // Permission checks for the bot
      const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
      if (!botMember.permissions.has(PermissionsBitField.FLAGS.SEND_MESSAGES) || !botMember.permissions.has(PermissionsBitField.FLAGS.EMBED_LINKS)) {
        await interaction.reply('The bot does not have the required permissions to execute this command.');
        return;
      }

      const channel = interaction.options.getChannel('channel');
      inviteTracker.setInviteChannel(interaction.guildId, channel.id);

      await interaction.reply('Invite channel has been set successfully.');
    } catch (error) {
      console.error('Error handling setinvitechannel command:', error);
      await interaction.reply('An error occurred while executing the command. Please try again later.');
    }
  },

  category: 'Invite Tracker',
  categoryDescription: 'Commands related to invite tracking functionality',
};
