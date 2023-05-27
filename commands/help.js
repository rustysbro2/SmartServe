const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction) {
    const commandCategories = [];
    const defaultCategory = 'Uncategorized'; // Specify the default category name

    // Get the absolute path to the commands directory
    const commandsDirectory = path.join(__dirname);

    // Read all command modules from the commands directory
    const commandFiles = fs.readdirSync(commandsDirectory).filter((file) => file.endsWith('.js'));

    // Loop through each command module
    for (const file of commandFiles) {
      if (file === 'help.js') continue; // Skip the help command file

      const command = require(path.join(commandsDirectory, file));

      // Check if the command module has a category property
      if (command.category) {
        // Check if the category already exists in the commandCategories array
        const category = commandCategories.find((category) => category.name === command.category);

        if (category) {
          // Add the command to the existing category
          category.commands.push({
            name: command.data.name,
            description: command.data.description,
          });
        } else {
          // Create a new category and add the command to it
          commandCategories.push({
            name: command.category,
            description: command.categoryDescription,
            commands: [
              {
                name: command.data.name,
                description: command.data.description,
              },
            ],
          });
        }
      } else {
        // Assign the command to the default category
        commandCategories.push({
          name: defaultCategory,
          description: 'Commands that do not belong to any specific category',
          commands: [
            {
              name: command.data.name,
              description: command.data.description,
            },
          ],
        });
      }
    }

    // Create the string select menu and add options for each command category
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    commandCategories.forEach((category) => {
      selectMenu.addOption(
        new StringSelectMenuOptionBuilder()
          .setLabel(category.name)
          .setDescription(category.description)
          .setValue(category.name)
      );
    });

    // Create the action row with the select menu
    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    // Create the initial embed with the category information
    const initialEmbed = new EmbedBuilder()
      .setTitle('Command Categories')
      .setDescription('Please select a category from the dropdown menu.')
      .setColor('#0099ff');

    // Send the initial embed with the action row
    await interaction.reply({ embeds: [initialEmbed], components: [actionRow] });
  },
};