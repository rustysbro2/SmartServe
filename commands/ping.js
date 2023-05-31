const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the current ping of the bot'),

  async execute(interaction) {
    try {
      const reply = await interaction.deferReply({ ephemeral: true });
      const ping = reply.createdTimestamp - interaction.createdTimestamp;
      await interaction.editReply(`Pong! Bot Latency: ${ping}ms, API Latency: ${Math.round(interaction.client.ws.ping)}ms`);
    } catch (error) {
      console.error('Error replying to ping command:', error);
    }
  },

  global: false, // Command is not global (optional, as it defaults to false)
  category: 'General', // Specify the category
  categoryDescription: 'Commands related to general functionality', // Specify the category description
};
