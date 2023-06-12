const { SlashCommandBuilder } = require('discord.js');
const pool = require('../../../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('opt')
    .setDescription('Toggle the vote reminder opt-in/opt-out status'),

  async execute(interaction) {
    const discordId = interaction.user.id;

    try {
      // Check if the user already has a row in the table
      const [rows] = await pool.promise().query('SELECT * FROM users WHERE discord_id = ?', [discordId]);
      if (rows.length === 0) {
        // Insert a new row for the user and set opt_out_status to 1
        await pool.promise().query('INSERT INTO users (discord_id, opt_out_status) VALUES (?, 1)', [discordId]);
        await interaction.reply('You have successfully opted out of the vote reminder.');
      } else {
        // Toggle the opt_out_status for the user
        const optOutStatus = rows[0].opt_out_status;
        const newOptOutStatus = optOutStatus === 1 ? 0 : 1;
        await pool.promise().query('UPDATE users SET opt_out_status = ? WHERE discord_id = ?', [newOptOutStatus, discordId]);
        
        if (newOptOutStatus === 1) {
          await interaction.reply('You have successfully opted out of the vote reminder.');
        } else {
          await interaction.reply('You have successfully opted back in to the vote reminder.');
        }
      }
    } catch (error) {
      console.error(`Error updating opt-out status for user with Discord ID ${discordId}:`, error);
      await interaction.reply('An error occurred while updating the opt-out status. Please try again later.');
    }
  },
};
