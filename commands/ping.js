const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the current ping of the bot'),

  async execute(interaction) {
    try {
      // Command logic
    } catch (error) {
      console.error('Error replying to ping command:', error);
    }
  },

  global: false,
  category: 'General',
  categoryDescription: 'Commands related to general functionality', // Ensure this is a non-empty string
};
