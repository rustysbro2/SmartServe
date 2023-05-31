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

  if (!categoryEmbed || categoryEmbed.fields.length === 0) {
    const selectMenu = interaction.message.components[0]?.components[0];

    if (selectMenu && selectMenu.options.length > 0) {
      const updatedOptions = selectMenu.options.filter((option) => option.value !== selectedCategory);

      if (updatedOptions.length === 0) {
        interaction.message.components = [];
      } else {
        selectMenu.options = updatedOptions;
      }

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

  async execute(interaction, client, commandCategories) {
    if (interaction.deferred || interaction.replied) {
      console.log('Interaction already deferred or replied to.');
      return;
    }

    const isGlobalGuild = !guildId || (interaction.guildId && interaction.guildId === guildId);

    const filteredCommandCategories = commandCategories.filter((category) =>
      isGlobalGuild ? !category.guildId : category.guildId === interaction.guildId
    ).slice(0, 10);

    const usedOptionValues = new Set();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

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
      await interaction.deferReply();
      const message = await interaction.editReply({ embeds: [initialEmbed], components: [actionRow] });

      client.on('interactionCreate', async (interaction) => {
        if (interaction.isSelectMenu() && interaction.customId === 'help_category') {
          await handleSelectMenu(interaction, commandCategories);
        }
      });
    } catch (error) {
      console.error('Error replying to interaction:', error);
    }
  },
  handleSelectMenu,
};
