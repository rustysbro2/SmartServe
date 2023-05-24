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
      selectMenu.addOptions({
        label: category.name,
        value: category.name,
      });
    });

    // Create the action row with the select menu
    const actionRow = new MessageActionRow()
      .addComponents(selectMenu);

    // Reply with the help embed and action row
    await interaction.reply({ embeds: [helpEmbed], components: [actionRow] });

    // Create a collector for the select menu interaction
    const collector = interaction.channel.createMessageComponentCollector({
      componentType: 'SELECT_MENU',
      time: 60000, // 1 minute
      max: 1,
    });

    collector.on('collect', async (collectedInteraction) => {
      if (collectedInteraction.customId === 'help_category') {
        const selectedCategory = collectedInteraction.values[0];

        const selectedCommands = commandCategories.find(category => category.name === selectedCategory)?.commands;

        if (selectedCommands) {
          const categoryEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(selectedCategory)
            .setDescription('Here are the available commands:');

          selectedCommands.forEach(command => {
            categoryEmbed.addField(command.name, command.description);
          });

          await collectedInteraction.update({ embeds: [categoryEmbed], components: [] });
        } else {
          await collectedInteraction.update({ content: 'Invalid category selected.', components: [] });
        }
      }
    });

    collector.on('end', async (collected) => {
      await interaction.editReply({ content: 'Category selection expired.', components: [] });
    });
  },
};
