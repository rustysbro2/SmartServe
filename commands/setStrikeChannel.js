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

    if (!strikeChannel || !strikeChannel.isText()) {
      return interaction.reply('Invalid channel provided. Please provide a valid text channel.');
    }

    const guildId = interaction.guildId;
    const channelId = strikeChannel.id;

    setStrikeChannel(guildId, channelId);

    interaction.reply(`Strike channel set to ${strikeChannel}.`);
  },
};
