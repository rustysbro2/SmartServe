// commands/help.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command.'),

  async execute(interaction) {
    const commands = interaction.client.commands;
    
    // Create the help embed
    const helpEmbed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle('Help')
      .setDescription('Here are the available commands:');
    
    // Add a field for each command
    commands.forEach((command) => {
      const commandData = command.data.toJSON();
      helpEmbed.addField(commandData.name, commandData.description);
    });
    
    // Reply with the help embed
    await interaction.reply({ embeds: [helpEmbed] });
  },
};
