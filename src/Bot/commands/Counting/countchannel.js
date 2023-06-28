const { SlashCommandBuilder } = require('discord.js');
const { setCountingChannel } = require('../../features/countGame.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('countchannel')
    .setDescription('Designate a counting channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The counting channel')
        .setRequired(true)
    ),
  async execute(interaction) {
    const channelId = interaction.options.getChannel('channel').id;
    setCountingChannel(channelId);

    await interaction.reply('Counting channel set!');
  },
};
