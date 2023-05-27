const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Function to handle select menu interaction
async function handleSelectMenu(interaction, commandCategories) {
  const selectedCategory = interaction.values[0];

  // Find the category based on the selected value
  const category = commandCategories.find(
    (category) =>
      category.name.toLowerCase().replace(/\s/g, '_') === selectedCategory
  );

  if (category) {
    // Create the embed with the category's commands
    const categoryEmbed = new EmbedBuilder()
      .setTitle(`Commands - ${category.name}`)
      .setDescription(category.description || 'No description available');

    // Add the commands as fields in the embed
    category.commands.forEach((command) => {
      categoryEmbed.addFields({
        name: command.name,
        value: command.description,
      });
    });

    try {
      // Update the original reply with the category embed
      await interaction.editReply({ embeds: [categoryEmbed], components: [] });
    } catch (error) {
      console.error('Error editing interaction reply:', error);
    }
  } else {
    console.error(`Category '${selectedCategory}' not found.`);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction, client) {
    if (interaction.deferred || interaction.replied) {
      // Interaction has already been replied to or deferred
      return;
    }

    const commandCategories = [];
    const defaultCategoryName = 'Uncategorized'; // Specify the default category name

    // Get the absolute path to the commands directory (same directory as help.js)
    const commandsDirectory = path.join(__dirname, '../commands');

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

    // Create the select menu options
    const selectMenuOptions = commandCategories.map((category) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(category.name)
        .setValue(category.name.toLowerCase().replace(/\s/g, '_'))
    );

    // Create the select menu component
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category')
      .addOptions(selectMenuOptions);

    // Create the action row with the select menu
    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    // Create the initial reply message
    await interaction.reply({ content: 'Please select a category:', components: [actionRow] });
  },

  handleSelectMenu,
};
