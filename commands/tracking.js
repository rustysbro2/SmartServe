const { SlashCommandBuilder } = require('@discordjs/builders');
const { setTrackingChannel } = require('../trackingLogic');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('track')
    .setDescription('Track user joins using invite codes')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Set the tracking channel')
        .setRequired(true)
    ),

  async execute(interaction) {
    const trackingChannel = interaction.options.getChannel('channel');

    if (!trackingChannel || !trackingChannel.isText()) {
      return interaction.reply('Please select a text channel for tracking.');
    }

    const guildId = interaction.guild.id;
    const channelId = trackingChannel.id;

    try {
      await setTrackingChannel(guildId, channelId);
      await interaction.reply(`Tracking channel set to ${trackingChannel}`);
    } catch (error) {
      console.error('Error setting tracking channel:', error);
      await interaction.reply('An error occurred while setting the tracking channel.');
    }
  },
};
