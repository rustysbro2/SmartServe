const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
    if (!interaction.member.permissions.has('MANAGE_GUILD')) {
      await interaction.reply('You do not have permission to use this command.');
      return;
    }

    // Permission checks for the bot
    const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
    if (!botMember.permissions.has('SEND_MESSAGES') || !botMember.permissions.has('EMBED_LINKS')) {
      await interaction.reply('The bot does not have the required permissions to execute this command.');
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
