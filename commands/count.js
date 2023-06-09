const { SlashCommandBuilder } = require('discord.js');
const countingGame = require('../features/countingGame');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('count')
    .setDescription('Increment the count by one'),

  async execute(interaction) {
    try {
      // Check if the bot has permission to send messages in the interaction channel
      if (!interaction.channel.permissionsFor(interaction.client.user).has('SEND_MESSAGES')) {
        return interaction.reply('I do not have permission to send messages in this channel.');
      }

      countingGame.incrementCount();
      const count = countingGame.getCount();
      await interaction.reply(`Count: ${count}`);
    } catch (error) {
      console.error('Error executing count command:', error);
      await interaction.reply('An error occurred while executing the command. Please try again later.');
    }
  }
};
