const { SlashCommandBuilder } = require('discord.js');
const pool = require('../../../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('opt')
    .setDescription('Toggle the vote reminder opt-in/opt-out status'),

  async execute(interaction) {
    const discordId = interaction.user.id;

    try {
      const userOptOut = await checkUserOptOut(discordId);

      if (userOptOut) {
        // User is already opted out, opt them back in
        await pool.query('UPDATE users SET opt_out_status = 0 WHERE discord_id = ?', [discordId]);
        await interaction.reply('You have opted back in to receive vote reminders.');
      } else {
        // User is not opted out, opt them out
        await pool.query('UPDATE users SET opt_out_status = 1 WHERE discord_id = ?', [discordId]);
        await interaction.reply('You have successfully opted out of the vote reminder.');
      }
    } catch (error) {
      console.error(`Error updating opt-out status for user with Discord ID ${discordId}:`, error);
      await interaction.reply('An error occurred while updating opt-out status. Please try again later.');
    }
  }

