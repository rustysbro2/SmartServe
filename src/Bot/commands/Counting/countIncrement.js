const { SlashCommandBuilder } = require('discord.js');
const { pool } = require('../../../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setincrement')
    .setDescription('Set the increment value')
    .addIntegerOption(option =>
      option.setName('value')
        .setDescription('The new increment value')
        .setRequired(true)
    ),
  async execute(interaction) {
    const newIncrement = interaction.options.getInteger('value');

    console.log('Debug - New Increment:', newIncrement);

    if (isNaN(newIncrement)) {
      console.log('Debug - Invalid Increment Value');
      await interaction.reply('Invalid increment value provided.');
      return;
    }

    try {
      const guildId = interaction.guild.id;
      const sql = 'UPDATE count_table SET increment_value = ? WHERE guild_id = ?';

      console.log('Debug - SQL Command:', sql);
      console.log('Debug - SQL Values:', [newIncrement, guildId]);

      // Retrieve the current increment value from the database before the update
      const currentResult = await pool.query('SELECT increment_value FROM count_table WHERE guild_id = ?', [guildId]);
      const currentIncrement = currentResult[0]?.increment_value;

      console.log('Debug - Current Increment Value in Database:', currentIncrement);

      await pool.query(sql, [newIncrement, guildId]);

      console.log('Debug - Increment Value Updated:', newIncrement);

      // Retrieve the updated increment value from the database after the update
      const updatedResult = await pool.query('SELECT increment_value FROM count_table WHERE guild_id = ?', [guildId]);
      const updatedIncrement = updatedResult[0]?.increment_value;

      console.log('Debug - Updated Increment Value in Database:', updatedIncrement);

      await interaction.reply('Increment value updated successfully!');
    } catch (error) {
      console.error('Error updating increment value:', error);
      console.error('Query Error:', error.sql);
      console.error('Query Parameters:', error.parameters);
      await interaction.reply('An error occurred while updating the increment value.');
    }
  },
};
