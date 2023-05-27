const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction) {
    const commandCategories = [];
    const commandFiles = fs.readdirSync(__dirname).filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(`./${file}`);
      if (command.category) {
        const category = commandCategories.find((category) => category.name === command.category);

        if (category) {
          category.commands.push({
            name: command.data.name,
            description: command.data.description,
          });
        } else {
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

    const embed = new EmbedBuilder()
      .setTitle('Command Categories')
      .setDescription('Please select a category from the dropdown menu.')
      .setColor('#0099ff');

    await interaction.reply({ embeds: [embed], components: [actionRow] });
  },
};