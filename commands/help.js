const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction, client) {
    if (interaction.deferred || interaction.replied) {
      // Interaction has already been replied to or deferred
      return;
    }

    if (interaction.isSelectMenu()) {
      // Handle the select menu interaction
      const selectedCategory = interaction.values[0];
      // Add your logic to fetch and display commands for the selected category

      // Example code to reply to the select menu interaction
      await interaction.reply(`You selected the category: ${selectedCategory}`);
      return;
    }

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
        // Check if the category already exists in the commandCategories array
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

    const usedOptionValues = new Set(); // Track used option values

    // Create the string select menu and add options for each command category
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    commandCategories.forEach((category) => {
      const optionBuilder = new StringSelectMenuOptionBuilder()
        .setLabel(category.name)
        .setValue(generateUniqueOptionValue(category.name)); // Generate a unique option value

      // Set the description only if it exists and is not empty
      if (category.description && category.description.length > 0) {
        optionBuilder.setDescription(category.description);
      }

      selectMenu.addOption(optionBuilder);
    });

    // Create the action row and add the select menu component
    const actionRow = new ActionRowBuilder().addComponent(selectMenu);

    // Create the initial embed with the action row and select menu
    const initialEmbed = new EmbedBuilder()
      .setTitle('Help')
      .setDescription('Select a category to view the available commands')
      .setColor('#0099ff');

    // Send the initial embed with the action row and select menu
    await interaction.reply({
      embeds: [initialEmbed],
      components: [actionRow],
    });
  },
};

// Helper function to generate a unique option value
function generateUniqueOptionValue(categoryName) {
  let optionValue = categoryName.toLowerCase().replace(/\s+/g, '_'); // Convert category name to lowercase and replace spaces with underscores

  // If the generated option value is already used, append a unique suffix
  let counter = 2;
  while (usedOptionValues.has(optionValue)) {
    optionValue = `${optionValue}_${counter}`;
    counter++;
  }

  usedOptionValues.add(optionValue);
  return optionValue;
}
