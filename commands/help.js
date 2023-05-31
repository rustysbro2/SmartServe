const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const { guildId } = require('../config.js');

async function handleSelectMenu(interaction, commandCategories) {
  const selectedCategory = interaction.values[0];
  const category = commandCategories.find(
    (category) =>
      category.name.toLowerCase().replace(/\s/g, '_') === selectedCategory
  );

  if (category) {
    const categoryEmbed = new EmbedBuilder()
      .setTitle(`Commands - ${category.name}`)
      .setDescription(category.description || 'No description available');

    category.commands.forEach((command) => {
      if (command.global !== false || !command.hasOwnProperty('global')) {
        categoryEmbed.addFields({ name: command.name, value: command.description });
      } else {
        console.log(`Skipping global false command '${command.name}'`);
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

    const filteredCommandCategories = commandCategories.filter((category) =>
      isGlobal ? !category.guildId : category.guildId === interaction.guildId
    ).slice(0, 10);

    const usedOptionValues = new Set();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    // Add options to the select menu
    filteredCommandCategories.forEach((category) => {
      category.commands.forEach((command) => {
        if (command.global !== false || !command.hasOwnProperty('global')) {
          const optionBuilder = new StringSelectMenuOptionBuilder()
            .setLabel(command.name)
            .setValue(generateUniqueOptionValue(command.name));

          if (command.description && command.description.length > 0) {
            optionBuilder.setDescription(command.description);
          }

          selectMenu.addOptions(optionBuilder);
        } else {
          console.log(`Skipping global false command '${command.name}'`);
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

      // Get global commands
      const globalCommands = commandCategories
        .filter((category) => !category.guildId)
        .flatMap((category) => category.commands)
        .map((command) => command.name);

      console.log('Global Commands:', globalCommands);
    } catch (error) {
      console.error('Error replying to interaction:', error);
    }
  },

  handleSelectMenu,
};
