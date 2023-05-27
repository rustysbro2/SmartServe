const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the current ping of the bot'),

  async execute(interaction) {
    await interaction.reply(`Pong! Ping: ${interaction.client.ws.ping}ms`);
  },
  
  category: 'General', // Add this line to specify the category
};