const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const { guildId } = require('../config.js');

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
      if (command.global === false) return; // Exclude global commands from the category

      console.log('Adding command to embed:', command.data.name);
      categoryEmbed.addFields({ name: command.data.name, value: command.data.description });
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

  async execute(interaction, client, commandCategories, guildId) {
    console.log('Help command interaction received:', interaction);

    if (interaction.deferred || interaction.replied) {
      console.log('Interaction already deferred or replied to.');
      return;
    }

    const isGlobal = !guildId || (interaction.guildId && interaction.guildId === guildId);

    const filteredCommandCategories = commandCategories.filter((category) =>
      isGlobal ? !category.guildId : category.guildId === interaction.guildId
    ).slice(0, 10);

    const usedOptionValues = new Set();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    // Add options to the select menu
    filteredCommandCategories.forEach((category) => {
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
