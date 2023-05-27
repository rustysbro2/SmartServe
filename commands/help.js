const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction) {
    const commandCategories = [];
    const defaultCategoryName = 'Uncategorized'; // Specify the default category name

    // Get the absolute path to the commands directory (same directory as help.js)
    const commandsDirectory = path.join(__dirname);

    // Read all command modules from the commands directory
    const commandFiles = fs.readdirSync(commandsDirectory).filter((file) => file.endsWith('.js'));

    // Loop through each command module
    for (const file of commandFiles) {
      if (file === 'help.js') continue; // Skip the help command file

      const command = require(path.join(commandsDirectory, file));

      // Check if the command module has a category property
      if (command.category) {
        let category = commandCategories.find((category) => category.name === command.category);

        if (!category) {
          // Create a new category if it doesn't exist
          category = {
            name: command.category,
            description: '', // Initialize the description as an empty string
            commands: [],
          };

          commandCategories.push(category);
        }

        // Add the command to the category
        category.commands.push({
          name: command.data.name,
          description: command.data.description,
        });
      } else {
        // Assign the command to the default category
        let defaultCategory = commandCategories.find((category) => category.name === defaultCategoryName);

        if (!defaultCategory) {
          // Create the default category if it doesn't exist
          defaultCategory = {
            name: defaultCategoryName,
            description: 'Commands that do not belong to any specific category',
            commands: [],
          };

          commandCategories.push(defaultCategory);
        }

        // Add the command to the default category
        defaultCategory.commands.push({
          name: command.data.name,
          description: command.data.description,
        });
      }
    }

    // Log the command categories to check for duplicates
    console.log('Command Categories:', commandCategories);

    // Create the string select menu and add options for each command category
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    // Create a set to keep track of used option values
    const usedOptionValues = new Set();

    commandCategories.forEach((category) => {
      const optionBuilder = new StringSelectMenuOptionBuilder()
        .setLabel(category.name)
        .setValue(category.name);

      // Generate a unique option value if it is already used
      while (usedOptionValues.has(optionBuilder.value)) {
        optionBuilder.setValue(optionBuilder.value + '_'); // Append an underscore to the value
      }

      // Add the option value to the set
      usedOptionValues.add(optionBuilder.value);

      // Set the description only if it exists and is not empty
      if (category.description && category.description.length > 0) {
        optionBuilder.setDescription(category.description);
      }

      selectMenu.addOptions(optionBuilder);
    });

    // Log the select menu options to check for duplicates
    console.log('Select Menu Options:', selectMenu.toJSON());

    // Create the action row with the select menu
    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    // Create the initial embed with the category information
    const initialEmbed = new EmbedBuilder()
      .setTitle('Command Categories')
      .setDescription('Please select a category from the dropdown menu.')
      .setColor('#0099ff');

    // Send the initial embed with the action row and select menu
    await interaction.reply({ embeds: [initialEmbed], components: [actionRow] });
  },
};
