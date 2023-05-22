const { CommandInteractionOptionResolver } = require('discord.js');
const { setTrackingChannel } = require('../trackingLogic');

module.exports = {
  data: {
    name: 'track',
    description: 'Track user joins using invite codes',
    options: [
      {
        name: 'channel',
        description: 'Set the tracking channel',
        type: 'CHANNEL',
        required: true,
      },
    ],
  },
  async execute(interaction) {
    const options = new CommandInteractionOptionResolver(interaction.options);
    const trackingChannel = options.getChannel('channel');

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
