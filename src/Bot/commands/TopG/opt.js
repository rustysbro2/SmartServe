const { SlashCommandBuilder } = require('discord.js');
const pool = require('../../../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('optout')
    .setDescription('Opt out of the vote reminder'),

  async execute(interaction) {
    const discordId = interaction.user.id;

    try {
      // Check if the user already has a row in the table
      const [rows] = await pool.promise().query('SELECT * FROM users WHERE discord_id = ?', [discordId]);
      if (rows.length === 0) {
        // Insert a new row for the user
        await pool.promise().query('INSERT INTO users (discord_id, opt_out_status) VALUES (?, 1)', [discordId]);
      } else {
        // Update the opt_out_status for the user
        await pool.promise().query('UPDATE users SET opt_out_status = 1 WHERE discord_id = ?', [discordId]);
      }

      await interaction.reply('You have successfully opted out of the vote reminder.');
    } catch (error) {
      console.error(`Error opting out user with Discord ID ${discordId}:`, error);
      await interaction.reply('An error occurred while opting out. Please try again later.');
    }
  },
};
