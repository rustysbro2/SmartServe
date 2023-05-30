const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('A simple test command'),

  async execute(interaction) {
    await interaction.reply('Test command executed!');
  },
};
