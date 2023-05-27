const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction) {
    const commandCategories = [];
    const defaultCategory = 'Uncategorized'; // Specify the default category name

    // Get the absolute path to the commands directory (same directory as help.js)
    const commandsDirectory = path.join(__dirname);

    // Read all command modules from the commands directory
    const commandFiles = fs.readdirSync(commandsDirectory).filter((file) => file.endsWith('.js'));

    // Loop through each command module
    for (const file of commandFiles) {
      if (file === 'help.js') continue; // Skip the help command file

      const command = require(path.join(commandsDirectory, file));

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
          const newCategory = {
            name: command.category,
            commands: [
              {
                name: command.data.name,
                description: command.data.description,
              },
            ],
          };

          // Check if the category has a description property and it is not empty
          if (command.hasOwnProperty('categoryDescription') && command.categoryDescription.length > 0) {
            newCategory.description = command.categoryDescription;
          }

          commandCategories.push(newCategory);
        }
      } else {
        // Assign the command to the default category
        commandCategories.push({
          name: defaultCategory,
          description: 'Commands that do not belong to any specific category',
          commands: [
            {
              name: command.data.name,
              description: command.data.description,
            },
          ],
        });
      }
    }

    // Debug statement: Log the command categories
    console.log('Command Categories:', commandCategories);

    const usedOptionValues = new Set(); // Track used option values

    // Create the string select menu and add options for each command category
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    commandCategories.forEach((category) => {
      const optionBuilder = new StringSelectMenuOptionBuilder()
        .setLabel(category.name)
        .setValue(generateUniqueOptionValue(category.name)); // Generate a unique option value

      // Set the description only if it exists and is not empty
      if (category.hasOwnProperty('description') && category.description.length > 0) {
        optionBuilder.setDescription(category.description);
      }

      selectMenu.addOptions(optionBuilder);
    });

    // Function to generate a unique option value
    function generateUniqueOptionValue(categoryName) {
      const sanitizedCategoryName = categoryName.toLowerCase().replace(/\s/g, '_');

      let optionValue = sanitizedCategoryName;
      let index = 1;

      // Append a number to the option value until it becomes unique
      while (usedOptionValues.has(optionValue)) {
        optionValue = `${sanitizedCategoryName}_${index}`;
        index++;
      }

      usedOptionValues.add(optionValue);
      return optionValue;
    }

    // Debug statement: Log the select menu options
    console.log('Select Menu Options:', selectMenu.toJSON());

    // Create the action row with the select menu
    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    // Debug statement: Log the action row
    console.log('Action Row:', actionRow.toJSON());

    // Create the initial embed with the category information
    const initialEmbed = new EmbedBuilder()
      .setTitle('Command Categories')
      .setDescription('Please select a category from the dropdown menu.')
      .setColor('#0099ff');

    // Debug statement: Log the initial embed
    console.log('Initial Embed:', initialEmbed.toJSON());

    // Send the initial embed with the action row and select menu
    console.log('Replying to interaction...');
    await interaction.reply({ embeds: [initialEmbed], components: [actionRow] });
    console.log('Interaction replied successfully.');

    // Execute the command
    const commandName = interaction.commandName;
    console.log('Executing command:', commandName);

    const command = client.commands.get(commandName);
    if (!command) {
      console.log('Command not found:', commandName);
      return;
    }

    try {
      await command.execute(interaction, client);
      console.log('Command executed successfully:', commandName);
    } catch (error) {
      console.error('Error executing command:', error);
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  },
};
