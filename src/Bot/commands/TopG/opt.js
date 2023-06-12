const { SlashCommandBuilder } = require('discord.js');
const pool = require('../../../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('optout')
    .setDescription('Opt out of the vote reminder'),

  async execute(interaction) {
    const discordId = interaction.user.id;

    try {
      // Update the vote_reminder_status for the user
      await pool.query('UPDATE users SET vote_reminder_status = false WHERE discord_id = ?', [discordId]);

      await interaction.reply('You have successfully opted out of the vote reminder.');
    } catch (error) {
      console.error(`Error opting out user with Discord ID ${discordId}:`, error);
      await interaction.reply('An error occurred while opting out. Please try again later.');
    }
  },
};
