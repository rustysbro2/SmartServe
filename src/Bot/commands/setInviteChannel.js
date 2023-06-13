const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, PermissionsBitField  } = require('discord.js');
const inviteTracker = require('../features/inviteTracker.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setinvite')
    .setDescription('Set the channel for invite tracking messages')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send messages in')
        .setRequired(true)),

  async execute(interaction) {
    // Permission checks for the user
    const member = interaction.member;
    if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      await interaction.reply("You must have the 'Manage Server' permission to use this command.");
      return;
    }

    const guild = interaction.guild;
    const botMember = await guild.members.fetch(interaction.client.user.id);

    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      await interaction.reply("I need the 'Manage Server' permission to track invites.");
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
