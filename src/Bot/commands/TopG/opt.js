const { SlashCommandBuilder } = require('discord.js');
const pool = require('../../../database.js');

const data = new SlashCommandBuilder()
  .setName('optout')
  .setDescription('Opt-out of vote reminders');

async function execute(interaction) {
  try {
    const userId = interaction.user.id;

    // Update the user's opt-out status in the database
    await saveOptOutStatusToDatabase(userId, true);

    // Respond with a confirmation message
    await interaction.reply('You have opted out of vote reminders. You will no longer receive reminders.');
  } catch (error) {
    console.error('Error handling opt-out command:', error);
    await interaction.reply('An error occurred while processing your opt-out request.');
  }
}

async function saveOptOutStatusToDatabase(userId, optedOut) {
  try {
    await pool.query('INSERT INTO vusers (userId, optedOut) VALUES (?, ?) ON DUPLICATE KEY UPDATE optedOut = ?', [userId, optedOut, optedOut]);
  } catch (error) {
    console.error('Error saving opt-out status to the database:', error);
    throw error;
  }
}

module.exports = {
  data,
  execute
};
