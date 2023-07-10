// strike-set-channel.js
const { SlashCommandBuilder } = require('discord.js');
const { pool } = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike-set-channel')
    .setDescription('Set the channel where strike updates will be posted')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to post updates in')
        .setRequired(true)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    try {
      const updateQuery = `
        INSERT INTO strike_channels (guild_id, channel_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE channel_id = ?
      `;
      const updateValues = [guildId, channel.id, channel.id];

      await pool.query(updateQuery, updateValues);
      await interaction.reply(`Strike updates will be posted in ${channel.name}`);
    } catch (error) {
      console.error('Error setting strike channel:', error);
      await interaction.reply('An error occurred while setting the strike channel.');
    }
  },
};
