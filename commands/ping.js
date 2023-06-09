const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the current ping of the bot'),

  async execute(interaction) {
    try {
      // Check if the user has the required permissions
      if (!interaction.channel.permissionsFor(interaction.member).has('SEND_MESSAGES')) {
        await interaction.reply('You do not have permission to use this command.');
        return;
      }

      const sent = await interaction.reply('Pinging...');
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      await interaction.editReply(`Pong! Bot latency: ${latency}ms, API latency: ${Math.round(interaction.client.ws.ping)}ms`);
    } catch (error) {
      console.error('Error replying to ping command:', error);
      // Only send a message indicating an error occurred without specifying the reason
      await interaction.reply('An error occurred while executing the command.');
    }
  },

  global: false,
  category: 'General',
  categoryDescription: 'Commands related to general functionality', // Ensure this is a non-empty string
};
