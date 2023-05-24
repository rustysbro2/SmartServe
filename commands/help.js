// commands/help.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageEmbed, MessageSelectMenu } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command.'),

  async execute(interaction) {
    const commands = interaction.client.commands;

    // Define command categories and their respective commands
    const commandCategories = [
      {
        name: 'Music',
        commands: [
          { name: 'play', description: 'Play a song.' },
          { name: 'skip', description: 'Skip the current song.' },
        ],
      },
      {
        name: 'Invite Tracker',
        commands: [
          { name: 'setinvitechannel', description: 'Set the invite tracking channel.' },
        ],
      },
    ];

    // Create the help embed
    const helpEmbed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle('Help')
      .setDescription('Please select a category:');

    // Create the select menu with category options
    const selectMenu = new MessageSelectMenu()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    // Add options to the select menu based on command categories
    commandCategories.forEach(category => {
      const options = category.commands.map(command => ({
        label: command.name,
        value: command.name,
        description: command.description,
      }));

      selectMenu.addOptions({
        label: category.name,
        value: category.name,
        description: `Commands: ${options.map(option => option.label).join(', ')}`,
        options: options,
      });
    });

    // Create the action row with the select menu
    const actionRow = new MessageActionRow()
      .addComponents(selectMenu);

    // Reply with the help embed and action row
    await interaction.reply({ embeds: [helpEmbed], components: [actionRow] });

    // Listen for the 'SELECT_MENU' interaction type
    const filter = i => i.isSelectMenu() && i.customId === 'help_category';
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

    collector.on('collect', async i => {
      const selectedCategory = i.values[0];

      // Handle the selected category here
      // You can send a new message, update the original message, or perform any other action based on the category selected

      // Example: Sending a response based on the selected category
      const responseEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`Selected Category: ${selectedCategory}`)
        .setDescription('Perform some action here based on the category selected.');

      await i.reply({ embeds: [responseEmbed], ephemeral: true });
    });

    collector.on('end', () => {
      // Clean up or perform any necessary actions when the collector ends
    });
  },
};
