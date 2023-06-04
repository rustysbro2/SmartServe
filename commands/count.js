const { SlashCommandBuilder } = require('discord.js');
const countingGame = require('../features/countingGame');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('count')
    .setDescription('Increment the count by one'),

  async execute(interaction) {
    try {
      countingGame.incrementCount();
      const count = countingGame.getCount();
      await interaction.reply(`Count: ${count}`);
    } catch (error) {
      console.error('Error executing count command:', error);
    }
  }
};
//5
