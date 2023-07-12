const { SlashCommandBuilder } = require('discord.js')
const { pool } = require('../../../database.js')

// Function to update the increment value in the database
async function updateIncrementValue (guildId, newIncrement) {
  try {
    const sql = 'UPDATE count_table SET increment_value = ? WHERE guild_id = ?'
    await pool.query(sql, [newIncrement, guildId])
  } catch (error) {
    console.error('Error updating increment value:', error)
    console.error('Query Error:', error.sql)
    console.error('Query Parameters:', error.parameters)
    throw error
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setincrement')
    .setDescription('Set the increment value')
    .addIntegerOption((option) =>
      option
        .setName('value')
        .setDescription('The new increment value')
        .setRequired(true)
    ),

  async execute (interaction) {
    const newIncrement = interaction.options.getInteger('value')

    console.log('Debug - New Increment:', newIncrement)

    if (isNaN(newIncrement)) {
      console.log('Debug - Invalid Increment Value')
      await interaction.reply('Invalid increment value provided.')
      return
    }

    try {
      const guildId = interaction.guild.id

      // Update the increment value in the database
      await updateIncrementValue(guildId, newIncrement)

      console.log('Debug - Increment Value Updated:', newIncrement)

      await interaction.reply('Increment value updated successfully!')
    } catch (error) {
      await interaction.reply(
        'An error occurred while updating the increment value.'
      )
    }
  },

  category: 'Counting'
}
