const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function handleSelectMenu(interaction, commandCategories) {
  console.log('Select menu interaction received:', interaction);

  const selectedCategory = interaction.values[0];

  console.log('Selected category:', selectedCategory);

  const category = commandCategories.find(
    (category) =>
      category.name.toLowerCase().replace(/\s/g, '_') === selectedCategory
  );

  if (category) {
    console.log('Category found:', category.name);

    const categoryEmbed = new EmbedBuilder()
      .setTitle(`Commands - ${category.name}`)
      .setDescription(category.description || 'No description available');

    category.commands.forEach((command) => {
      console.log('Adding command to embed:', command.name);
      categoryEmbed.addFields({ name: command.name, value: command.description });
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

    const usedOptionValues = new Set();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    // Add Uncategorized category
    const uncategorizedCommands = commandCategories.find((category) => category.name === 'Uncategorized');

    if (uncategorizedCommands) {
      const optionBuilder = new StringSelectMenuOptionBuilder()
        .setLabel(uncategorizedCommands.name)
        .setValue(generateUniqueOptionValue(uncategorizedCommands.name));

      selectMenu.addOptions(optionBuilder);
    }

    commandCategories.forEach((category) => {
      if (category.name === 'Uncategorized') {
        return;
      }

      const optionBuilder = new StringSelectMenuOptionBuilder()
        .setLabel(category.name)
        .setValue(generateUniqueOptionValue(category.name));

      if (category.description && category.description.length > 0) {
        optionBuilder.setDescription(category.description);
      }

      selectMenu.addOptions(optionBuilder);

      category.commands.forEach((command) => {
        console.log('Adding command to uncategorized:', command.name);
        const uncategorizedOptionBuilder = new StringSelectMenuOptionBuilder()
          .setLabel(command.name)
          .setValue(generateUniqueOptionValue(command.name));

        if (command.description && command.description.length > 0) {
          uncategorizedOptionBuilder.setDescription(command.description);
        }

        selectMenu.addOptions(uncategorizedOptionBuilder);
      });
    });

    function generateUniqueOptionValue(value) {
      const sanitizedValue = value.toLowerCase().replace(/\s/g, '_');

      let optionValue = sanitizedValue;
      let index = 1;

      while (usedOptionValues.has(optionValue)) {
        optionValue = `${sanitizedValue}_${index}`;
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
