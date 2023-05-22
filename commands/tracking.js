const { SlashCommandBuilder } = require('@discordjs/builders');
const { setTrackingChannel } = require('../TrackingLogic');

const setTrackingChannelCommand = {
  data: new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Set the tracking channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel for tracking')
        .setRequired(true)
    ),

  execute: async (interaction) => {
    const channel = interaction.options.getChannel('channel');
    if (channel) {
      setTrackingChannel(interaction.guild.id, channel.id);
      interaction.reply(`Tracking channel set to <#${channel.id}>.`);
    } else {
      interaction.reply('Please provide a valid channel.');
    }
  }
};

const trackingCommands = [setTrackingChannelCommand];

module.exports = {
  trackingCommands
};
