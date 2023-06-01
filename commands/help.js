const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const { guildId } = require('../config.js');
console.log('Guild ID from config.js:', guildId);


async function handleSelectMenu(interaction, commandCategories, guildId) {
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
    } else {
      categoryEmbed.setDescription('No description available.');
    }

    console.log(`Interaction Guild ID: ${interaction.guildId}, Guild ID from config.js: ${guildId}`);
    const commandsToShow = category.commands.filter((command) => {
      const shouldShow = command.global === true || (command.global === false && interaction.guildId === guildId);
      console.log(`Should show command "${command.name}": ${shouldShow}`);
      return shouldShow;
    });

    console.log('Commands to Show:');
    commandsToShow.forEach((command) => {
      console.log(`Command: ${command.name}`);
      console.log(`Category: ${category.name}`);
      console.log(`Global: ${command.global}`);
    });

    commandsToShow.forEach((command) => {
      categoryEmbed.addFields({ name: command.name, value: command.description });
    });

    console.log('Category Embed:', categoryEmbed);

    try {
      if (interaction.message) {
        const actionRow = new ActionRowBuilder().addComponents(...interaction.message.components[0].components);
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

  async execute(interaction, client, commandCategories) {
    console.log('Guild ID from config.js:', guildId);
    if (interaction.deferred || interaction.replied) {
      console.log('Interaction already deferred or replied to.');
      return;
    }

    const isGlobal = !guildId || (interaction.guildId && interaction.guildId === guildId);

    const filteredCommandCategories = commandCategories
      .filter((category) => 
        category.commands.some((command) => command.global === true || (command.global === false && interaction.guildId === guildId))
      )
      .slice(0, 10);


    const usedOptionValues = new Set();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    filteredCommandCategories.forEach((category) => {
      if (category.commands.some((command) => command.global !== false || command.guildId === undefined)) {
        const categoryName = category.name.toLowerCase().replace(/\s/g, '_');
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(category.name)
            .setValue(categoryName)
            .setDescription(category.categoryDescription || 'No description available.') // Updated line
        );
        usedOptionValues.add(categoryName);
      }
    });

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    try {
      await interaction.reply({ content: 'Please select a category:', components: [actionRow] });
    } catch (error) {
      console.error('Error replying to interaction:', error);
    }
  },
  handleSelectMenu,
};
