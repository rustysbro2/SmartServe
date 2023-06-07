const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the current ping of the bot'),

  async execute(interaction) {
    try {
      const sent = await interaction.reply('Pinging...');
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      interaction.editReply(`Pong! Bot latency: ${latency}ms, API latency: ${Math.round(interaction.client.ws.ping)}ms`);
    } catch (error) {
      console.error('Error replying to ping command:', error);
    }
  },

  global: false,
  category: 'General',
  categoryDescription: 'Commands related to general functionality', // Ensure this is a non-empty string
};
