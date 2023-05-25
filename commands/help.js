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

    // Check if the interaction is a command or a message component
    if (interaction.isCommand()) {
      // Reply with the main menu
      await interaction.reply({ embeds: [helpEmbed], components: [actionRow] });
    } else if (interaction.isMessageComponent()) {
      // Fetch the original message to be edited
      const { channel, id } = interaction.message;
      const originalMessage = await channel.messages.fetch(id);

      // Edit the original message with the updated menu
      await originalMessage.edit({ embeds: [helpEmbed], components: [actionRow] });
    }

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

        // Create a new embed for the category commands
        const categoryEmbed = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`Category: ${selectedCategory}`)
          .setDescription('Here are the commands in this category:');

        categoryCommands.commands.forEach((command) => {
          categoryEmbed.addField(command.name, command.description);
        });

        // Create options to go back to the main menu or to the other menu
        const backButton = new MessageSelectMenu()
          .setCustomId('help_back')
          .setPlaceholder('Go back to main menu')
          .addOptions({
            label: 'Main Menu',
            value: 'main_menu',
            description: 'Go back to the main menu',
          });

        const otherMenuButton = new MessageSelectMenu()
          .setCustomId('help_other_menu')
          .setPlaceholder('Go to other menu')
          .addOptions({
            label: 'Other Menu',
            value: 'other_menu',
            description: 'Go to the other menu',
          });

        // Create a new action row with the back button and other menu button
        const categoryActionRow = new MessageActionRow()
          .addComponents(backButton, otherMenuButton);

        // Update the message with the category commands and action row
        await collectedInteraction.update({
          embeds: [categoryEmbed],
          components: [categoryActionRow],
        });
      } else if (collectedInteraction.customId === 'help_back') {
        // Update the message with the main menu again
        await collectedInteraction.update({
          embeds: [helpEmbed],
          components: [actionRow],
        });
      } else if (collectedInteraction.customId === 'help_other_menu') {
        // Update the message with the other menu
        const otherMenuEmbed = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle('Other Menu')
          .setDescription('This is the other menu.');

        // Create an option to go back to the main menu
        const backButton = new MessageSelectMenu()
          .setCustomId('help_back')
          .setPlaceholder('Go back to main menu')
          .addOptions({
            label: 'Main Menu',
            value: 'main_menu',
            description: 'Go back to the main menu',
          });

        // Create a new action row with the back button
        const otherMenuActionRow = new MessageActionRow().addComponents(backButton);

        // Update the message with the other menu and action row
        await collectedInteraction.update({
          embeds: [otherMenuEmbed],
          components: [otherMenuActionRow],
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
