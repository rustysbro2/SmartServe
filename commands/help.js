const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const { guildId } = require('../config.js');

async function handleSelectMenu(interaction, commandCategories, guildId) {
  console.log('Interaction guild ID:', interaction.guildId);
  console.log('Stored guild ID:', guildId);
  const selectedCategory = interaction.values[0];
  const category = commandCategories.find(
    (category) =>
      category.name.toLowerCase().replace(/\s/g, '_') === selectedCategory
  );

  let categoryEmbed;

  if (category) {
    categoryEmbed = new EmbedBuilder();
    categoryEmbed.setTitle(`Commands - ${category.name}`);
    categoryEmbed.setDescription(category.categoryDescription || 'No description available.');

    const commandsToShow = category.commands.filter((command) => {
      const shouldShow = command.global === true || (command.global === false && interaction.guildId === guildId);
      return shouldShow;
    });

    console.log('Commands to show:', commandsToShow); // Debugging line

    commandsToShow.forEach((command) => {
      categoryEmbed.addFields({ name: command.name, value: command.description });
    });

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
    if (interaction.deferred || interaction.replied) {
      console.log('Interaction already deferred or replied to.');
      return;
    }

    const filteredCommandCategories = commandCategories
      .filter((category) => 
        category.commands.some((command) => command.global === true || (command.global === false && interaction.guildId === guildId))
      )
      .slice(0, 10);

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
            .setDescription(category.categoryDescription || 'No description available.')
        );
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
