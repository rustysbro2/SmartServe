const { SlashCommandBuilder, EmbedBuilder  } = require('discord.js');
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
      // Permission checks for the user
      if (!interaction.member.permissions.has('MANAGE_GUILD')) {
        await interaction.reply('You do not have permission to use this command.');
        return;
      }

      // Permission checks for the bot
      const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
      const requiredPermissions = new Permissions(['SEND_MESSAGES', 'EMBED_LINKS']);
      if (!botMember.permissions.has(requiredPermissions)) {
        const missingPermissions = requiredPermissions.missing(botMember.permissions);
        await interaction.reply(`The bot does not have the required permissions to execute this command. Missing permissions: ${missingPermissions.join(', ')}`);
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
