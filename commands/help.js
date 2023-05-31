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
    categoryEmbed = new EmbedBuilder();
    categoryEmbed.setTitle(`Commands - ${category.name}`);

    if (category.categoryDescription && category.categoryDescription.length > 0) {
      categoryEmbed.setDescription(category.categoryDescription);
    }

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
        const actionRow = new ActionRowBuilder().addComponents(interaction.message.components[0]);
        await interaction.deferUpdate();
        await interaction.message.edit({ embeds: [categoryEmbed], components: [actionRow] });
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
      const categoryEmbed = initialEmbed.toJSON(); // Convert the EmbedBuilder object to JSON
      await interaction.reply({ embeds: [initialEmbed.toJSON()], components: [actionRow] });
      console.log('Initial embed sent.');
    } catch (error) {
      console.error('Error replying to interaction:', error);
    }
  },


  handleSelectMenu,
};
