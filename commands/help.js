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

    let currentMenu = 'main_menu';
    let prevMenuOptions = [];

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
        } else if (currentMenu === 'Music') {
          menuEmbed = helpEmbed;
          menuOptions = [
            ...prevMenuOptions,
            { label: 'Invite Tracker', value: 'Invite Tracker', description: 'View Invite Tracker commands' },
          ];
          currentMenu = 'main_menu';
        } else if (currentMenu === 'Invite Tracker') {
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

        if (collectedInteraction.values[0] === 'Invite Tracker') {
          const inviteEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Invite Tracker Commands')
            .setDescription('Here are the commands for the Invite Tracker category:');

          // Add the invite tracker commands to the embed
          commandCategories.forEach((category) => {
            if (category.name === 'Invite Tracker') {
              category.commands.forEach((command) => {
                inviteEmbed.addField(command.name, command.description);
              });
            }
          });

          await interaction.followUp({ embeds: [inviteEmbed] });
        }
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
