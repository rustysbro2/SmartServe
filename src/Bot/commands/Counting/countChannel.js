const { SlashCommandBuilder } = require('discord.js');
const { setCountingChannel } = require('../../features/countGame.js');
const { pool } = require('../../../database.js');

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
    const guildId = interaction.guild.id;
    const channelId = interaction.options.getChannel('channel').id;
    console.log('Channel ID:', channelId); // Add this line for debugging
    await setCountingChannel(guildId, channelId);

    // Store the counting channel in the database
    try {
      console.log('Channel ID before query:', channelId); // Add this line for debugging
      await pool.query('INSERT INTO count_table (guild_id, channel_id, current_count) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE channel_id = VALUES(channel_id), current_count = VALUES(current_count)', [guildId, channelId, 1]);
      console.log('Counting channel stored:', channelId);
    } catch (error) {
      console.error('Error storing counting channel:', error);
      return interaction.reply('An error occurred while setting the counting channel.');
    }

    await interaction.reply('Counting channel set!');
  },
};
