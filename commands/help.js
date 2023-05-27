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
      categoryEmbed.addFields(command.name, command.description);
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
    const defaultCategoryName = 'Uncategorized';

    const commandsDirectory = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsDirectory).filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      if (file === 'help.js') continue;

      const command = require(path.join(commandsDirectory, file));

      if (command.category) {
        let category = commandCategories.find((category) => category.name === command.category);

        if (!category) {
          category = {
            name: command.category,
            description: '',
            commands: [],
          };

          commandCategories.push(category);
        }

        category.commands.push({
          name: command.data.name,
          description: command.data.description,
        });
      } else {
        let defaultCategory = commandCategories.find((category) => category.name === defaultCategoryName);

        if (!defaultCategory) {
          defaultCategory = {
            name: defaultCategoryName,
            description: 'Commands that do not belong to any specific category',
            commands: [],
          };

          commandCategories.push(defaultCategory);
        }

        defaultCategory.commands.push({
          name: command.data.name,
          description: command.data.description,
        });
      }
    }

    const usedOptionValues = new Set();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    commandCategories.forEach((category) => {
      const optionBuilder = new StringSelectMenuOptionBuilder()
        .setLabel(category.name)
        .setValue(generateUniqueOptionValue(category.name));

      if (category.description && category.description.length > 0) {
        optionBuilder.setDescription(category.description);
      }

      selectMenu.addOptions(optionBuilder);
    });

    function generateUniqueOptionValue(categoryName) {
      const sanitizedCategoryName = categoryName.toLowerCase().replace(/\s/g, '_');

      let optionValue = sanitizedCategoryName;
      let index = 1;

      while (usedOptionValues.has(optionValue)) {
        optionValue = `${sanitizedCategoryName}_${index}`;
        index++;
      }

      usedOptionValues.add(optionValue);
      return optionValue;
    }

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    const initialEmbed = new EmbedBuilder()
      .setTitle('Command Categories')
      .setDescription('Please select a category from the dropdown menu.')
      .setColor('#0099ff');

    try {
      await interaction.reply({ embeds: [initialEmbed], components: [actionRow] });
    } catch (error) {
      console.error('Error replying to interaction:', error);
    }
  },

  handleSelectMenu
};
