const { SlashCommandBuilder, PermissionFlagBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Select a member and kick them.')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to kick')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagBits.KickMembers),

  async execute(interaction) {
    // Permission checks for the user
    const member = interaction.member;
    if (!member.permissions.has(PermissionFlagBits.KickMembers)) {
      await interaction.reply("You must have the Kick Members permission to use this command.");
      return;
    }

    // Retrieve the target user from the command's options
    const targetUser = interaction.options.getUser('target');

    // Kick the target user
    try {
      await interaction.guild.members.kick(targetUser.id);
      await interaction.reply(`Successfully kicked ${targetUser.tag}.`);
    } catch (error) {
      console.error(`Failed to kick ${targetUser.tag}:`, error);
      await interaction.reply(`Failed to kick ${targetUser.tag}.`);
    }
  },
};
