const { SlashCommandBuilder, PermissionFlagBits } = require('discord.js');
const inviteTracker = require('../features/inviteTracker.js');

const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Select a member and kick them.')
  .addUserOption(option =>
    option
      .setName('target')
      .setDescription('The member to kick')
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

  async execute(interaction) {

      // Permission checks for the user
      const member = interaction.member;
      if (!member.permissions.has(Flags.KickMembers)) {
        await interaction.reply("You must be an administrator to perform this action.");
        return;
      }
    },
  category: 'Invite Tracker',
  categoryDescription: 'Commands related to invite tracking functionality',
};
