const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the current ping of the bot')
    .setGlobal(true) // Command is global
    .setCategory('General') // Specify the category
    .setDescription('Commands related to general functionality'), // Specify the category description

  execute(interaction) {
    interaction.reply(`Pong! Ping: ${interaction.client.ws.ping}ms`);
  }
};
