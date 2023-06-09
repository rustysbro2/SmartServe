const { SlashCommandBuilder, PermissionBitField } = require('discord.js');
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

      // Permission checks for the user
      const member = interaction.member;
      if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        await interaction.reply("You must be an administrator to perform this action.");
        return;
      }
    },
  category: 'Invite Tracker',
  categoryDescription: 'Commands related to invite tracking functionality',
};
