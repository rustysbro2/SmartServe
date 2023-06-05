const { SlashCommandBuilder } = require('discord.js');
const { setStrikeChannel } = require('../features/strikeFeature');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstrikechannel')
    .setDescription('Set the channel to log strike messages')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel to log strike messages')
        .setRequired(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const channelId = interaction.options.getChannel('channel').id;

    try {
      await setStrikeChannel(guildId, channelId);
      await interaction.reply(`Strike channel has been set to <#${channelId}>.`);
    } catch (error) {
      console.error('Error setting strike channel:', error);
      await interaction.reply('An error occurred while setting the strike channel.');
    }
  },
};
