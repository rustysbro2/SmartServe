const { SlashCommandBuilder, Permissions } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the current ping of the bot'),

  async execute(interaction) {
    // Bot Permissions
    const guild = interaction.guild;
    const botMember = await guild.members.fetch(interaction.client.user.id);
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewChannel | PermissionsBitField.Flags.SendMessages)) { // Replace with the desired bot permissions
      await interaction.reply("I need the 'ViewChannel' and 'SendMessage' permissions in a text channel to use this command.");
      return;
    }

    try {
      const sent = await interaction.reply('Pinging...');
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      interaction.editReply(`Pong! Bot latency: ${latency}ms, API latency: ${Math.round(interaction.client.ws.ping)}ms`);
    } catch (error) {
      console.error('Error replying to ping command:', error);
    }
  },

  category: 'General',
  categoryDescription: 'Commands related to general functionality', // Ensure this is a non-empty string
};
