const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function handleSelectMenu(interaction, commandCategories) {
  console.log('Select menu interaction received:', interaction);

  const selectedCategory = interaction.values[0];

  console.log('Selected category:', selectedCategory);

  if (selectedCategory.toLowerCase() === 'uncategorized') {
    const uncategorizedCommands = commandCategories.find((category) => category.name === '');

    if (uncategorizedCommands && uncategorizedCommands.commands.length > 0) {
      console.log('Uncategorized commands found:', uncategorizedCommands.commands);

      const categoryEmbed = new EmbedBuilder()
        .setTitle('Uncategorized Commands')
        .setDescription('Here are the uncategorized commands:')
        .setColor('#0099ff');

      uncategorizedCommands.commands.forEach((command) => {
        categoryEmbed.addField(command.name, command.description);
      });

      try {
        if (interaction.message) {
          await interaction.deferUpdate();
          console.log('Interaction deferred.');
          await interaction.message.edit({ embeds: [categoryEmbed] });
          console.log('Interaction message updated.');
        } else {
          console.error('Interaction does not have a message.');
        }
      } catch (error) {
        console.error('Error deferring or editing interaction:', error);
      }
    } else {
      console.log('No uncategorized commands found.');
    }
  } else {
    const category = commandCategories.find(
      (category) => category.name.toLowerCase().replace(/\s/g, '_') === selectedCategory
    );

    if (category) {
      console.log('Category found:', category.name);

      const categoryEmbed = new EmbedBuilder()
        .setTitle(`Commands - ${category.name}`)
        .setDescription(category.description || 'No description available');

      category.commands.forEach((command) => {
        categoryEmbed.addField(command.name, command.description);
      });

      try {
        if (interaction.message) {
          await interaction.deferUpdate();
          console.log('Interaction deferred.');
          await interaction.message.edit({ embeds: [categoryEmbed] });
          console.log('Interaction message updated.');
        } else {
          console.error('Interaction does not have a message.');
        }
      } catch (error) {
        console.error('Error deferring or editing interaction:', error);
      }
    } else {
      console.error(`Category '${selectedCategory}' not found.`);
    }
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction, client, commandCategories) {
    console.log('Help command interaction received:', interaction);

    if (interaction.deferred || interaction.replied) {
      console.log('Interaction already deferred or replied to.');
      return;
    }

    const defaultCategoryName = 'Uncategorized';

    const usedOptionValues = new Set();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    // Add the "Uncategorized" category explicitly
    const uncategorizedOption = new StringSelectMenuOptionBuilder()
      .setLabel(defaultCategoryName)
      .setValue(generateUniqueOptionValue(defaultCategoryName));
    selectMenu.addOptions(uncategorizedOption);

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
      console.log('Initial embed sent.');
    } catch (error) {
      console.error('Error replying to interaction:', error);
    }
  },

  handleSelectMenu,
};
