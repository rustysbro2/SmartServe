const { SlashCommandBuilder } = require('@discordjs/builders');
const { setTrackingChannel } = require('../trackingLogic');

const trackCommand = {
  data: new SlashCommandBuilder()
    .setName('track')
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
      await interaction.reply(`Tracking channel set to <#${channel.id}>.`);
    } else {
      await interaction.reply('Please provide a valid channel.');
    }
  },
};

module.exports = trackCommand;