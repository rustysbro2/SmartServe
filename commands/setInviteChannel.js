const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const inviteTracker = require('../features/inviteTracker.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setinvitechannel')
    .setDescription('Set the channel for invite tracking messages')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send messages in')
        .setRequired(true))
    .setPermissions(['MANAGE_GUILD', 'SEND_MESSAGES', 'EMBED_LINKS']), // Require "Manage Server", "Send Messages", and "Embed Links" permissions

  async execute(interaction) {
    // Check if the user has the necessary permissions
    if (!interaction.member.permissions.has('MANAGE_GUILD') || !interaction.member.permissions.has('SEND_MESSAGES') || !interaction.member.permissions.has('EMBED_LINKS')) {
      await interaction.reply('You do not have the required permissions to use this command!');
      return;
    }

    const channel = interaction.options.getChannel('channel');
    inviteTracker.setInviteChannel(interaction.guildId, channel.id);

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('Invite Channel Set')
      .setDescription(`Invite tracking messages will be sent in ${channel}`)
      .setThumbnail(interaction.client.user.displayAvatarURL());

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  category: 'Invite Tracker',
  categoryDescription: 'Commands related to invite tracking functionality',
};
