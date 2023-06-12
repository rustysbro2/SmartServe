const { SlashCommandBuilder } = require('discord.js');
const pool = require('../../../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('opt')
    .setDescription('Toggle vote reminders'),
  async execute(interaction) {
    try {
      const discordId = interaction.user.id;

      // Fetch the current opt-in status from the database
      const [row] = await pool.query('SELECT optIn FROM topgg_opt WHERE discordId = ?', [discordId]);

      let optIn = false;
      if (row) {
        optIn = !row.optIn;
        // Update the optIn value in the database
        await pool.query('UPDATE topgg_opt SET optIn = ? WHERE discordId = ?', [optIn, discordId]);
      }

      await interaction.reply(`Vote reminders have been ${optIn ? 'enabled' : 'disabled'}.`);

    } catch (error) {
      console.error('Error executing opt command:', error);
      await interaction.reply('An error occurred while processing your request.');
    }
  },
};
