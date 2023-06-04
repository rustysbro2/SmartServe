// commands/setStrikeChannel.js

const { SlashCommandBuilder } = require('discord.js');
const { setStrikeChannel } = require('../features/strikeFeature');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstrikechannel')
    .setDescription('Set the strike channel for strikes logging')
    .addChannelOption(option => option.setName('channel').setDescription('Select a channel').setRequired(true)),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    try {
      await setStrikeChannel(guildId, channel.id);
      await interaction.reply(`Strike channel set to ${channel} successfully.`);
    } catch (error) {
      console.error('Error setting strike channel:', error);
      await interaction.reply('Failed to set the strike channel.');
    }
  },
};
