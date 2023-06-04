const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { logStrike, getStrikes } = require('../features/strikeFeature');
const pool = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Strike a user')
    .addUserOption(option =>
      option.setName('user').setDescription('Select a user').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Enter the reason for the strike').setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const guildId = interaction.guild.id;

    logStrike(pool, guildId, user.id, reason);

    const strikeCount = await getStrikes(pool, guildId, user.id);

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Strike Added')
      .setDescription(`User: ${user.tag}\nReason: ${reason}\nTotal Strikes: ${strikeCount}`)
      .setTimestamp()
      .build();

    await interaction.reply({ embeds: [embed] });
  },
};
