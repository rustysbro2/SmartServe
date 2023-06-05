// commands/setStrikeChannel.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const { setStrikeChannel } = require('../features/strikeFeature.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstrikechannel')
    .setDescription('Set the strike channel for logging strikes')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to set as the strike channel')
        .setRequired(true)
    ),
  async execute(interaction) {
    const strikeChannel = interaction.options.getChannel('channel');

    console.log('Strike Channel:', strikeChannel);

    if (!strikeChannel || !strikeChannel.isText()) {
      console.log('Invalid Channel');
      return interaction.reply('Invalid channel provided. Please provide a valid text channel.');
    }

    const guildId = interaction.guildId;
    const channelId = strikeChannel.id;

    console.log('Guild ID:', guildId);
    console.log('Channel ID:', channelId);

    setStrikeChannel(guildId, channelId);

    console.log('Strike channel set');

    interaction.reply(`Strike channel set to ${strikeChannel}.`);
  },
};
