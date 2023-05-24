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

    // Keep track of the current menu
    let currentMenu = 'main_menu';

    // Create an array to store previous menu options for navigation
    const prevMenuOptions = [
      { label: 'Main Menu', value: 'main_menu', description: 'Go back to the main menu' },
      { label: 'Music', value: 'Music', description: 'View Music commands' },
      { label: 'Invite Tracker', value: 'Invite Tracker', description: 'View Invite Tracker commands' },
    ];

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

    collector.on('collect', async (collectedInteraction) => {
      if (collectedInteraction.customId === 'help_category') {
        const selectedCategory = collectedInteraction.values[0];
        const categoryCommands = commandCategories.find(
          (category) => category.name === selectedCategory
        );

        const categoryEmbed = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`Category: ${selectedCategory}`)
          .setDescription('Here are the commands in this category:');

        categoryCommands.commands.forEach((command) => {
          categoryEmbed.addField(command.name, command.description);
        });

        const backButton = new MessageSelectMenu()
          .setCustomId('help_back')
          .setPlaceholder('Go back to main menu')
          .addOptions(prevMenuOptions);

        const categoryActionRow = new MessageActionRow().addComponents(backButton);

        await collectedInteraction.update({
          embeds: [categoryEmbed],
          components: [categoryActionRow],
        });

        currentMenu = selectedCategory;
      } else if (collectedInteraction.customId === 'help_back') {
        let menuEmbed, menuOptions;
        if (currentMenu === 'main_menu') {
          menuEmbed = helpEmbed;
          menuOptions = prevMenuOptions;
        } else if (currentMenu === 'Music' || currentMenu === 'Invite Tracker') {
          menuEmbed = helpEmbed;
          menuOptions = prevMenuOptions;
          currentMenu = 'main_menu';
        }

        const backButton = new MessageSelectMenu()
          .setCustomId('help_back')
          .setPlaceholder('Go back to main menu')
          .addOptions(menuOptions);

        const menuActionRow = new MessageActionRow().addComponents(backButton);

        await collectedInteraction.update({
          embeds: [menuEmbed],
          components: [menuActionRow],
        });
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
