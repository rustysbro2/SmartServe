const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction) {
    const commandCategories = [];

    // Read all command modules from the commands directory
    const commandFiles = fs.readdirSync('.').filter((file) => file.endsWith('.js'));

    // Loop through each command module
    for (const file of commandFiles) {
      const command = require(`./${file}`);

      // Check if the command module has a category property
      if (command.category) {
        // Check if the category already exists in the commandCategories array
        const category = commandCategories.find((category) => category.name === command.category);

        if (category) {
          // Add the command to the existing category
          category.commands.push({
            name: command.data.name,
            description: command.data.description,
          });
        } else {
          // Create a new category and add the command to it
          commandCategories.push({
            name: command.category,
            description: command.categoryDescription,
            commands: [
              {
                name: command.data.name,
                description: command.data.description,
              },
            ],
          });
        }
      }
    }

    // Create the string select menu and add options for each command category
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

    // Create the action row with the select menu
    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    // Create the initial embed with the category information
    const initialEmbed = new EmbedBuilder()
      .setTitle('Command Categories')
      .setDescription('Please select a category from the dropdown menu.')
      .setColor('#0099ff');

    // Send the initial embed with the action row
    await interaction.reply({ embeds: [initialEmbed], components: [actionRow] });
  },
};