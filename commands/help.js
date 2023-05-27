const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction) {
    const commandCategories = [];

    // Read all command modules from the commands directory
    const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

    // Loop through each command module
    for (const file of commandFiles) {
      const command = require(`./commands/${file}`);

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

    // Create the select menu and add options for each command category
    const selectMenu = new MessageSelectMenu()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    commandCategories.forEach((category) => {
      const options = category.commands.map((command) => ({
        label: `/${command.name}`,
        value: command.name,
        description: command.description,
      }));

      selectMenu.addOptions({
        label: category.name,
        value: category.name.toLowerCase(),
        description: category.description,
        options: options,
      });
    });

    // Create the message component collector
    const collector = interaction.channel.createMessageComponentCollector({ componentType: 'SELECT_MENU' });

    collector.on('collect', async (collected) => {
      const selectedCategory = collected.values[0];
      const category = commandCategories.find((c) => c.name.toLowerCase() === selectedCategory);

      if (category) {
        // Create the category embed
        const categoryEmbed = createCategoryEmbed(category);

        // Update the message with the category embed and the back button
        await collected.update({ embeds: [categoryEmbed], components: [createBackButton()] });
      }
    });

    collector.on('end', () => {
      interaction.followUp({ content: 'Category selection expired.', ephemeral: true });
    });

    // Create and send the initial message with the first category
    await interaction.reply({ embeds: [createCategoryEmbed(commandCategories[0])], components: [selectMenu] });
  },
};

// Helper function to create a category embed
function createCategoryEmbed(category) {
  const embed = new MessageEmbed()
    .setColor('#0099ff')
    .setTitle(`Category: ${category.name}`)
    .setDescription(category.description);

  category.commands.forEach((command) => {
    embed.addField(command.name, command.description);
  });

  return embed;
}

// Helper function to create the back button
function createBackButton() {
  const backButton = new MessageSelectMenu()
    .setCustomId('help_back')
    .setPlaceholder('Go back to main menu')
    .addOptions([{ label: 'Main Menu', value: 'main_menu', description: 'Go back to the main menu' }]);

  return new MessageActionRow().addComponents(backButton);
}
