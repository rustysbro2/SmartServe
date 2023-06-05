// setstrikechannel.js
const { SlashCommandBuilder } = require('discord.js');
const { setStrikeChannel } = require('../features/strikeFeature');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstrikechannel')
    .setDescription('Set the strike channel')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel for strikes')
        .setRequired(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const channel = interaction.options.getChannel('channel');

    try {
      await setStrikeChannel(guildId, channel.id); // Set the strike channel

      await interaction.reply(`Strike channel set to <#${channel.id}>.`);
    } catch (error) {
      console.error('Error setting strike channel:', error);
      await interaction.reply('An error occurred while setting the strike channel.');
    }
  },
};
