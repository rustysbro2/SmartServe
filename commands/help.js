// commands/help.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageEmbed, MessageSelectMenu } = require('discord.js');

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
      .setDescription('Please select a category:');
    
    // Get all unique categories from the commands
    const categories = [...new Set(commands.map(command => command.category))];
    
    // Create the select menu with category options
    const selectMenu = new MessageSelectMenu()
      .setCustomId('help_category')
      .setPlaceholder('Select a category')
      .addOptions(categories.map(category => ({
        label: category,
        value: category,
      })));

    // Create the action row with the select menu
    const actionRow = new MessageActionRow()
      .addComponents(selectMenu);
    
    // Reply with the help embed and action row
    await interaction.reply({ embeds: [helpEmbed], components: [actionRow] });
  },
};
