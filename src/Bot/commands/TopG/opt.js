const { SlashCommandBuilder } = require('discord.js');
const pool = require('../../../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('optout')
    .setDescription('Opt out of the vote reminder'),

  async execute(interaction) {
    const discordId = interaction.user.id;

    try {
      // Check if the user row exists
      const [rows] = await pool.promise().query('SELECT * FROM users WHERE discord_id = ?', [discordId]);
      if (rows.length === 0) {
        // User row doesn't exist, insert a new row
        await pool.promise().query('INSERT INTO users (discord_id, opt_out) VALUES (?, 1)', [discordId]);
      } else {
        // User row exists, update the opt_out column
        await pool.promise().query('UPDATE users SET opt_out = 1 WHERE discord_id = ?', [discordId]);
      }

      await interaction.reply('You have successfully opted out of the vote reminder.');
    } catch (error) {
      console.error(`Error opting out user with Discord ID ${discordId}:`, error);
      await interaction.reply('An error occurred while opting out. Please try again later.');
    }
  },
};
