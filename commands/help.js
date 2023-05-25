const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageEmbed, MessageSelectMenu } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command.'),

  async execute(interaction) {
    const commandCategories = [
      {
        name: 'General',
        description: 'General commands',
        commands: [
          { name: 'help', description: 'List all commands or info about a specific command' },
          { name: 'ping', description: 'Ping the bot' },
        ],
      },
      {
        name: 'Music',
        description: 'Commands related to music',
        commands: [
          { name: 'play', description: 'Play a song' },
          { name: 'voteskip', description: 'Vote to skip the currently playing song' },
        ],
      },
      {
        name: 'Invite Tracker',
        description: 'Commands related to invite tracking',
        commands: [
          { name: 'setinvitechannel', description: 'Set the invite tracking channel' },
        ],
      },
    ];

    const createCategoryEmbed = (category) => {
      if (!category) {
        return new MessageEmbed().setColor('#0099ff').setDescription('Invalid category');
      }

      const categoryEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`Category: ${category.name}`)
        .setDescription(category.description);

      category.commands.forEach((command) => {
        categoryEmbed.addField(command.name, command.description);
      });

      return categoryEmbed;
    };

    const selectMenu = new MessageSelectMenu()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    commandCategories.forEach((category) => {
      const options = category.commands
        .filter((command) => command.name !== interaction.commandName)
        .map((command) => ({
          label: `/${command.name}`,
          value: command.name,
          description: command.description,
        }));

      const backButtonOptions = commandCategories
        .filter((c) => c.name.toLowerCase() !== category.name.toLowerCase())
        .map((c) => ({
          label: c.name,
          value: c.name.toLowerCase(),
          description: `View ${c.name} commands`,
        }));

      const backButton = new MessageSelectMenu()
        .setCustomId('help_back')
        .setPlaceholder('Go back to main menu')
        .addOptions([
          { label: 'Main Menu', value: 'main_menu', description: 'Go back to the main menu' },
          ...backButtonOptions,
        ]);

      if (category.name.toLowerCase() === 'general') {
        selectMenu.addOptions({
          label: 'Main Menu',
          value: 'main_menu',
          description: 'Go back to the main menu',
        });
      } else {
        selectMenu.addOptions({
          label: category.name,
          value: category.name.toLowerCase(),
          description: category.description,
          options: options,
        });
      }

      category.backButton = backButton;
    });

    const collector = interaction.channel.createMessageComponentCollector({
      componentType: 'SELECT_MENU',
      time: 60000,
    });

    collector.on('collect', async (collected) => {
      if (collected.customId === 'help_category') {
        const selectedCategory = collected.values[0];
        const category = commandCategories.find((c) => c.name.toLowerCase() === selectedCategory);

        if (category) {
          const categoryEmbed = createCategoryEmbed(category);
          await collected.update({ embeds: [categoryEmbed], components: [new MessageActionRow().addComponents(category.backButton)] });
        }
      } else if (collected.customId === 'help_back') {
        if (collected.values[0] === 'main_menu') {
          await collected.update({ embeds: [mainMenuEmbed], components: [new MessageActionRow().addComponents(selectMenu)] });
        } else {
          const category = commandCategories.find((c) => c.name.toLowerCase() === collected.values[0]);
          const categoryEmbed = createCategoryEmbed(category);
          await collected.update({ embeds: [categoryEmbed], components: [new MessageActionRow().addComponents(category.backButton)] });
        }
      }
    });

    collector.on('end', () => {
      interaction.followUp({ content: 'Category selection expired.', ephemeral: true });
    });

    const currentCategory = commandCategories.find((category) => category.commands.some((command) => command.name === interaction.commandName));
    const mainMenuEmbed = createCategoryEmbed(currentCategory);

    // Remove the current menu option from the selection menu
    const filteredOptions = selectMenu.options.filter((option) => option.value !== interaction.commandName);

    selectMenu.options = filteredOptions;

    await interaction.reply({ embeds: [mainMenuEmbed], components: [new MessageActionRow().addComponents(selectMenu)] });
  },
};
