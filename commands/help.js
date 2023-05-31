const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const { guildId } = require('../config.js');

async function handleSelectMenu(interaction, commandCategories) {
  console.log('Interaction Guild ID:', interaction.guildId);

  const selectedCategory = interaction.values[0];
  const category = commandCategories.find(
    (category) =>
      category.name.toLowerCase().replace(/\s/g, '_') === selectedCategory
  );

  console.log('Command Categories:');
  commandCategories.forEach((category) => {
    console.log(`Category: ${category.name}`);
    console.log(`Guild ID: ${category.guildId}`);
    console.log('Commands:', category.commands);
  });

  let categoryEmbed;

  if (category) {
    categoryEmbed = new EmbedBuilder()
      .setTitle(`Commands - ${category.name}`)
      .setDescription(category.categoryDescription || 'No description available'); // Use categoryDescription here

    const guildSpecificCommands = category.commands.filter(
      (command) => command.guildId === interaction.guildId
    );
    const globalCommands = category.commands.filter(
      (command) => command.global !== false
    );

    console.log('Guild Specific Commands:');
    guildSpecificCommands.forEach((command) => {
      console.log(`Command: ${command.name}`);
      console.log(`Category: ${category.name}`);
      console.log(`Global: ${command.global}`);
    });

    console.log('Global Commands:');
    globalCommands.forEach((command) => {
      console.log(`Command: ${command.name}`);
      console.log(`Category: ${category.name}`);
      console.log(`Global: ${command.global}`);
    });

    const commandsToShow = guildSpecificCommands.length > 0 ? guildSpecificCommands : globalCommands;

    commandsToShow.forEach((command) => {
      categoryEmbed.addFields({ name: command.name, value: command.description });
    });

    console.log('Category Embed:', categoryEmbed);

    try {
      if (interaction.message) {
        await interaction.deferUpdate();
        await interaction.message.edit({ embeds: [categoryEmbed] });
      } else {
        console.error('Interaction does not have a message.');
      }
    } catch (error) {
      console.error('Error deferring or editing interaction:', error);
    }
  } else {
    console.error(`Category '${selectedCategory}' not found.`);
    return;
  }

  // Check if the category embed has no fields (commands)
  if (!categoryEmbed || categoryEmbed.fields?.length === 0) {
    // Get the dropdown menu component from the interaction
    const selectMenu = interaction.message.components[0]?.components[0];

    // Check if the select menu exists and has options
    if (selectMenu && selectMenu.options.length > 0) {
      // Find and remove the option corresponding to the empty category
      const updatedOptions = selectMenu.options.filter((option) => option.value !== selectedCategory);

      // Check if the updated options list is empty
      if (updatedOptions.length === 0) {
        // Remove the entire action row from the components
        interaction.message.components = [];
      } else {
        // Update the select menu with the modified options
        selectMenu.setOptions(updatedOptions);
      }

      // Edit the message to remove the empty category from the dropdown menu
      try {
        await interaction.message.edit({ components: [interaction.message.components[0]] });
      } catch (error) {
        console.error('Error editing message:', error);
      }
    }
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction, client, commandCategories, guildId) {
    console.log('Guild ID from config.js:', guildId);
    if (interaction.deferred || interaction.replied) {
      console.log('Interaction already deferred or replied to.');
      return;
    }

    const isGlobal = !guildId || (interaction.guildId && interaction.guildId === guildId);

    const filteredCommandCategories = commandCategories
      .filter((category) => isGlobal ? !category.guildId : category.guildId === interaction.guildId)
      .slice(0, 10);

    const usedOptionValues = new Set();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    filteredCommandCategories.forEach((category) => {
      if (category.commands.some((command) => command.global !== false || (isGlobal && command.global !== true))) {
        const optionBuilder = new StringSelectMenuOptionBuilder()
          .setLabel(category.name)
          .setValue(generateUniqueOptionValue(category.name));

        if (category.description && category.description.length > 0) {
          optionBuilder.setDescription(category.description);
        }

        selectMenu.addOptions(optionBuilder);
      }
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
