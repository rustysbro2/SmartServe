const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the current ping of the bot'),

  execute(interaction) {
    interaction.reply(`Pong! Ping: ${interaction.client.ws.ping}ms`);
  },

  global: true, // Command is not global (optional, as it defaults to false)
  category: 'General', // Specify the category
};
