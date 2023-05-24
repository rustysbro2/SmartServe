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
          { name: 'voteskip', description: 'Vote to skip the current song.' },
        ],
      },
      {
        name: 'Invite Tracker',
        commands: [
          { name: 'setinvitechannel', description: 'Set the invite tracking channel.' },
        ],
      },
    ];

    // Create the main help embed
    const helpEmbed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle('Help')
      .setDescription('Please select a category:');

    // Create the select menu with category options
    const selectMenu = new MessageSelectMenu()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    // Add options to the select menu based on command categories
    commandCategories.forEach((category) => {
      const options = category.commands.map((command) => ({
        label: command.name,
        value: command.name,
        description: command.description,
      }));

      selectMenu.addOptions({
        label: category.name,
        value: category.name,
        description: `Commands: ${options.map((option) => option.label).join(', ')}`,
        options: options,
      });
    });

    // Create the action row with the select menu
    const actionRow = new MessageActionRow().addComponents(selectMenu);

    // Reply with the main menu
    await interaction.reply({ embeds: [helpEmbed], components: [actionRow] });

    // Create a filter to only collect interactions from the original user
    const filter = (collectedInteraction) =>
      collectedInteraction.user.id === interaction.user.id;

    // Create a message component collector
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      componentType: 'SELECT_MENU',
      time: 60000, // 60 seconds
    });

    // Store the current menu selection
    let currentMenu = 'main_menu';

    collector.on('collect', async (collectedInteraction) => {
      if (collectedInteraction.customId === 'help_category') {
        const selectedCategory = collectedInteraction.values[0];
        const categoryCommands = commandCategories.find(
          (category) => category.name === selectedCategory
        );

        // Create a new embed for the category commands
        const categoryEmbed = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`Category: ${selectedCategory}`)
          .setDescription('Here are the commands in this category:');

        categoryCommands.commands.forEach((command) => {
          categoryEmbed.addField(command.name, command.description);
        });

        // Create an option to go back to the main menu
        const backButton = new MessageSelectMenu()
          .setCustomId('help_back')
          .setPlaceholder('Go back to main menu')
          .addOptions({
            label: 'Main Menu',
            value: 'main_menu',
            description: 'Go back to the main menu',
          });

        // Create options to go back to the previous menu
        const prevMenuOptions = commandCategories.map((category) => ({
          label: `Back to ${category.name}`,
          value: `back_to_${category.name}`,
          description: `Go back to the ${category.name} menu`,
        }));

        // Create a new action row with the back button and previous menu options
        const categoryActionRow = new MessageActionRow().addComponents(
          backButton,
          ...prevMenuOptions.map((option) =>
            new MessageSelectMenu().setCustomId(option.value).setPlaceholder(option.label)
          )
        );

        // Update the message with the category commands and action row
        await collectedInteraction.update({
          embeds: [categoryEmbed],
          components: [categoryActionRow],
        });

        // Update the current menu selection
        currentMenu = selectedCategory;
      } else if (collectedInteraction.customId === 'help_back') {
        // Update the message with the main menu again
        await collectedInteraction.update({
          embeds: [helpEmbed],
          components: [actionRow],
        });

        // Update the current menu selection
        currentMenu = 'main_menu';
      } else if (collectedInteraction.customId.startsWith('back_to_')) {
        // Determine the previous menu based on the customId
        const previousMenu = collectedInteraction.customId.replace('back_to_', '');

        // Find the commands for the previous menu
        const prevMenuCommands = commandCategories.find(
          (category) => category.name === previousMenu
        ).commands;

        // Create a new embed for the previous menu commands
        const prevMenuEmbed = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`Category: ${previousMenu}`)
          .setDescription('Here are the commands in this category:');

        prevMenuCommands.forEach((command) => {
          prevMenuEmbed.addField(command.name, command.description);
        });

        // Create an option to go back to the main menu
        const backButton = new MessageSelectMenu()
          .setCustomId('help_back')
          .setPlaceholder('Go back to main menu')
          .addOptions({
            label: 'Main Menu',
            value: 'main_menu',
            description: 'Go back to the main menu',
          });

        // Create options to go back to the previous menu
        const prevMenuOptions = commandCategories.map((category) => ({
          label: `Back to ${category.name}`,
          value: `back_to_${category.name}`,
          description: `Go back to the ${category.name} menu`,
        }));

        // Create a new action row with the back button and previous menu options
        const prevMenuActionRow = new MessageActionRow().addComponents(
          backButton,
          ...prevMenuOptions.map((option) =>
            new MessageSelectMenu().setCustomId(option.value).setPlaceholder(option.label)
          )
        );

        // Update the message with the previous menu commands and action row
        await collectedInteraction.update({
          embeds: [prevMenuEmbed],
          components: [prevMenuActionRow],
        });

        // Update the current menu selection
        currentMenu = previousMenu;
      }
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        interaction.followUp({
          content: 'Category selection expired.',
          embeds: [helpEmbed],
          components: [actionRow],
        });
      }
    });
  },
};
