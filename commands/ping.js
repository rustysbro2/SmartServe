const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s ping'),

  category: 'Utility',

  async execute(interaction) {
    const startTime = Date.now();
    const reply = await interaction.reply({ content: 'Pinging...', ephemeral: true });
    const endTime = Date.now();
    const ping = endTime - startTime;

    reply.edit(`Pong! Latency: ${ping}ms, API Latency: ${interaction.client.ws.ping}ms`);
  },
};