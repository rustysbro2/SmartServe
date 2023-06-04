const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { setStrikeChannel } = require('../features/strikeFeature');
const pool = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstrikechannel')
    .setDescription('Set the strike channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Select the strike channel').setRequired(true)
    ),
  async execute(interaction) {
    const channelId = interaction.options.getChannel('channel').id;
    const guildId = interaction.guild.id;

    setStrikeChannel(pool, guildId, channelId);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Strike Channel Set')
      .setDescription(`Strike channel has been set to <#${channelId}>.`)
      .setTimestamp()
      .build();

    await interaction.reply({ embeds: [embed] });
  },
};
