const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the current ping of the bot')
    .addGlobalOption() // Set the command as global
    .addCategory('General') // Set the category name
    .addCategoryDescription('Commands related to general functionality'), // Set the category description

  execute(interaction) {
    interaction.reply(`Pong! Ping: ${interaction.client.ws.ping}ms`);
  }
};
