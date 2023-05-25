const { SlashCommandBuilder } = require('@discordjs/builders');
const { getGuildCountingChannel, setGuildCountingChannel } = require('../features/countingGame');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setcountingchannel')
    .setDescription('Set the counting channel for the counting game')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to use for counting').setRequired(true)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    setGuildCountingChannel(interaction.guildId, channel.id);
    await interaction.reply(`Counting channel set to ${channel.name}`);
  },
};
