const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { guildId } = require('../config.js');//smememmej

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

  async execute(interaction, client) {
    console.log('Help command interaction received:', interaction);

    if (interaction.deferred || interaction.replied) {
      console.log('Interaction already deferred or replied to.');
      return;
    }

    const commandCategories = [];
    const defaultCategoryName = 'Uncategorized';

    const commandsDirectory = path.join(__dirname, '../commands');
    console.log('Commands directory:', commandsDirectory);

    const commandFiles = fs.readdirSync(commandsDirectory).filter((file) => file.endsWith('.js'));
    console.log('Command files:', commandFiles);

    for (const file of commandFiles) {
      if (file === 'help.js') continue;

      const command = require(path.join(commandsDirectory, file));
      console.log('Command module:', command);

      if (command.global !== false || (command.guildId && command.guildId !== guildId)) {
        continue; // Skip global commands and guild-specific commands for other guilds
      }

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

    console.log('Command categories:', commandCategories);

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
      console.log('Initial embed sent.');
    } catch (error) {
      console.error('Error replying to interaction:', error);
    }
  },

  handleSelectMenu,
};