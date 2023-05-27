const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction) {
    const commandCategories = [];
    const defaultCategory = 'Uncategorized';

    const commandsDirectory = path.join(__dirname);

    const commandFiles = fs.readdirSync(commandsDirectory).filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(path.join(commandsDirectory, file));

      if (command.category) {
        let category = commandCategories.find((category) => category.name === command.category);

        if (!category) {
          category = {
            name: command.category,
            description: command.categoryDescription,
            commands: [],
          };
          commandCategories.push(category);
        }

        category.commands.push({
          name: command.data.name,
          description: command.data.description,
        });
      } else {
        let category = commandCategories.find((category) => category.name === defaultCategory);

        if (!category) {
          category = {
            name: defaultCategory,
            description: 'Commands that do not belong to any specific category',
            commands: [],
          };
          commandCategories.push(category);
        }

        category.commands.push({
          name: command.data.name,
          description: command.data.description,
        });
      }
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    commandCategories.forEach((category) => {
      const options = category.commands.map((command) => {
        return new StringSelectMenuOptionBuilder()
          .setLabel(`/${command.name}`)
          .setDescription(command.description)
          .setValue(command.name);
      });

      selectMenu.addOptions(options);
    });

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    const initialEmbed = new EmbedBuilder()
      .setTitle('Command Categories')
      .setDescription('Please select a category from the dropdown menu.')
      .setColor('#0099ff');

    await interaction.reply({ embeds: [initialEmbed], components: [actionRow] });
  },
};