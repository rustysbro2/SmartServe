const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const { guildId } = require('../config.js');

async function handleSelectMenu(interaction, commandCategories) {
  const selectedCategory = interaction.values[0];
  const category = commandCategories.find(
    (category) =>
      category.name.toLowerCase().replace(/\s/g, '_') === selectedCategory
  );

  let categoryEmbed;

  if (category) {
    categoryEmbed = new EmbedBuilder()
      .setTitle(`Commands - ${category.name}`)
      .setDescription(category.description || 'No description available');

    category.commands.forEach((command) => {
      if (command.global !== false) {
        categoryEmbed.addFields({ name: command.name, value: command.description });
      }
    });

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
    if (interaction.deferred || interaction.replied) {
      console.log('Interaction already deferred or replied to.');
      return;
    }

    const isGlobal = !guildId || (interaction.guildId && interaction.guildId === guildId);

    let filteredCommandCategories = commandCategories;
    if (!isGlobal) {
      filteredCommandCategories = commandCategories.filter((category) =>
        category.guildId === interaction.guildId
      );
    }

    const usedOptionValues = new Set();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    filteredCommandCategories.forEach((category) => {
      console.log(`Category: ${category.name}`);

      category.commands.forEach((command) => {
        console.log(`Command: ${command.name}`);
        console.log(`Category: ${category.name}`);
        console.log(`Global: ${command.global}`);

        if (command.global !== false || (isGlobal && command.global !== true)) {
          selectMenu.addOptions((option) => {
            option
              .setLabel(command.name)
              .setValue(generateUniqueOptionValue(command.name))
              .setDescription(command.description || 'No description available');
          });
        }
      });
    });

    function generateUniqueOptionValue(commandName) {
      const sanitizedCommandName = commandName.toLowerCase().replace(/\s/g, '_');

      let optionValue = sanitizedCommandName;
      let index = 1;

      while (usedOptionValues.has(optionValue)) {
        optionValue = `${sanitizedCommandName}_${index}`;
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
