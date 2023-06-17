const { SlashCommandBuilder } = require('discord.js');
const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL connection settings
const connection = mysql.createPool({
  host: 'localhost',
  user: 'rustysbro',
  password: 'Dincas50@/',
  database: 'SmartBeta',
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName('opt')
    .setDescription('Opt out or opt back in to receive recurring reminders')
    .addBooleanOption(option => option.setName('opt_out').setDescription('Opt out or opt back in').setRequired(true)),

  async execute(interaction) {
    const optOut = interaction.options.getBoolean('opt_out');
    const userId = interaction.user.id;

    try {
      // Update the opt_out column in the database
      await connection.query('UPDATE users SET opt_out = ? WHERE user_id = ?', [optOut ? 1 : 0, userId]);

      const response = optOut ? 'You have successfully opted out of recurring reminders.' : 'You have successfully opted back in to receive recurring reminders.';
      await interaction.reply(response);
    } catch (error) {
      console.error('Error updating opt_out status:', error);
      await interaction.reply('An error occurred while updating your opt-out status. Please try again later.');
    }
  },
};
