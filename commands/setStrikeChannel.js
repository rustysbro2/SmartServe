// commands/setStrikeChannel.js

const { SlashCommandBuilder } = require('discord.js');
const { pool } = require('../database.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstrikechannel')
    .setDescription('Set the strike channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Select a channel')
        .setRequired(true)
    ),
  async execute(interaction) {
    const channelId = interaction.options.getChannel('channel').id;
    const guildId = interaction.guild.id;

    try {
      // Update the strike channel in the database
      await pool.query(
        'INSERT INTO strike_channels (guild_id, channel_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE channel_id = ?',
        [guildId, channelId, channelId]
      );

      // Create and send the success embed
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Strike Channel Set')
        .setDescription(`Strike channel has been set to <#${channelId}>.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error setting strike channel:', error);
      await interaction.reply('Error setting strike channel. Please try again later.');
    }
  },
};
