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

    // Create an array of option objects for the select menu
    const categoryOptions = commandCategories.map((category) => ({
      label: category.name,
      value: category.name,
      description: `Commands: ${category.commands.map((command) => command.name).join(', ')}`,
    }));

    // Create the select menu with category options
    const selectMenu = new MessageSelectMenu()
      .setCustomId('help_category')
      .setPlaceholder('Select a category')
      .addOptions(categoryOptions);

    // Create the action row with the select menu
    const actionRow = new MessageActionRow().addComponents(selectMenu);

    // Create a collector for the select menu interaction
    const collector = interaction.channel.createMessageComponentCollector({
      componentType: 'SELECT_MENU',
      max: 1,
      time: 60000,
    });

    collector.on('collect', async (collectedInteraction) => {
      if (collectedInteraction.customId === 'help_category' && collectedInteraction.user.id === interaction.user.id) {
        const selectedCategory = collectedInteraction.values[0];
        const categoryCommands = commandCategories.find((category) => category.name === selectedCategory);

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
          .addOptions([
            {
              label: 'Main Menu',
              value: 'main_menu',
              description: 'Go back to the main menu',
            },
          ]);

        // Create a new action row with the back button
        const categoryActionRow = new MessageActionRow().addComponents(backButton);

        await collectedInteraction.update({
          embeds: [categoryEmbed],
          components: [categoryActionRow],
        });
      } else if (collectedInteraction.customId === 'help_back' && collectedInteraction.user.id === interaction.user.id) {
        await collectedInteraction.update({
          embeds: [helpEmbed],
          components: [actionRow],
        });
      }
    });

    // Reply with the main help embed and action row
    await interaction.reply({ embeds: [helpEmbed], components: [actionRow] });
  },
};
