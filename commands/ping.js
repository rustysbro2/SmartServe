const { SlashCommandBuilder, Permissions } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the current ping of the bot'),

  async execute(interaction) {
    // Bot Permissions
    const guild = interaction.guild;
    const botMember = await guild.members.fetch(interaction.client.user.id);
    const requiredBotPermissions = PermissionsBitField.Flags.ViewChannel | PermissionsBitField.Flags.SendMessage; // Replace with the desired bot permissions

    if (!botMember.permissions.has(requiredBotPermissions)) {
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

  global: false,
  category: 'General',
  categoryDescription: 'Commands related to general functionality', // Ensure this is a non-empty string
};
