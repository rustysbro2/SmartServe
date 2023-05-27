const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction, client) {
    if (interaction.deferred || interaction.replied) {
      // Interaction has already been replied to or deferred
      return;
    }

    const commandCategories = []; // Array to store command categories

    // Read command files from the commands directory
    const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

    // Loop through each command file
    commandFiles.forEach((file) => {
      const command = require(`./${file}`);
      const category = command.category || 'Uncategorized';

      // Find the category in the commandCategories array
      const categoryData = commandCategories.find((category) => category.name === category);

      if (categoryData) {
        // Category already exists, add the command to it
        categoryData.commands.push(command.data.toJSON());
      } else {
        // Category doesn't exist, create a new category and add the command to it
        const newCategory = {
          name: category,
          commands: [command.data.toJSON()],
        };
        commandCategories.push(newCategory);
      }
    });

    const selectMenuOptions = commandCategories.map((category) => {
      return new StringSelectMenuBuilder().setLabel(category.name).setValue(category.name).setDescription(`View ${category.name} commands`);
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('categorySelect')
      .setPlaceholder('Select a category')
      .addOptions(selectMenuOptions);

    const actionRow = new ActionRowBuilder().addComponent(selectMenu);

    // Send the initial embed with the action row and select menu
    await interaction.reply({
      content: 'Please select a category to view the commands:',
      components: [actionRow],
    });

    // Handle the select menu interaction
    client.on('interactionCreate', async (interaction) => {
      if (interaction.isSelectMenu() && interaction.customId === 'categorySelect') {
        const selectedCategory = interaction.values[0];

        // Find the selected category in the commandCategories array
        const categoryData = commandCategories.find((category) => category.name === selectedCategory);

        if (categoryData) {
          const embed = new EmbedBuilder()
            .setTitle(`Commands - ${categoryData.name}`)
            .setDescription('Here are the commands for the selected category:');

          categoryData.commands.forEach((command) => {
            embed.addField(command.name, command.description);
          });

          // Edit the original reply with the embed
          await interaction.update({
            content: 'Selected category:',
            components: [],
            embeds: [embed],
          });
        } else {
          // Invalid category selected
          await interaction.update({
            content: 'Invalid category selected.',
            components: [],
          });
        }
      }
    });
  },
};
