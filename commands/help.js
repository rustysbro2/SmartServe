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

    const optionsMap = new Map(); // Map to store unique option values

    commandCategories.forEach((category) => {
      if (category.name.toLowerCase() === 'general') {
        const options = category.commands.map((command) => {
          const optionValue = `${category.name.toLowerCase()}_${command.name.toLowerCase()}`; // Unique option value
          optionsMap.set(optionValue, true); // Store option value in the map
          return {
            label: `/${command.name}`,
            value: optionValue,
            description: command.description,
          };
        });

        selectMenu.addOptions(options);
      } else {
        const categoryOption = {
          label: category.name,
          value: category.name.toLowerCase(),
          description: category.description,
        };

        selectMenu.addOptions(categoryOption);
      }
    });

    const backButtonOptions = commandCategories
      .filter((category) => category.name.toLowerCase() !== 'general')
      .map((category) => ({
        label: category.name,
        value: category.name.toLowerCase(),
        description: `View ${category.name} commands`,
      }));

    const backButton = new MessageSelectMenu()
      .setCustomId('help_back')
      .setPlaceholder('Go back to main menu')
      .addOptions([
        { label: 'Main Menu', value: 'main_menu', description: 'Go back to the main menu' },
        ...backButtonOptions,
      ]);

    const collector = interaction.channel.createMessageComponentCollector({
      componentType: 'SELECT_MENU',
      time: 60000,
    });

    collector.on('collect', async (collected) => {
      if (collected.customId === 'help_category') {
        const selectedOption = collected.values[0];
        const [categoryName, commandName] = selectedOption.split('_'); // Extract category and command names

        const category = commandCategories.find((c) => c.name.toLowerCase() === categoryName);

        if (category) {
          const categoryEmbed = createCategoryEmbed(category);
          await collected.update({ embeds: [categoryEmbed], components: [new MessageActionRow().addComponents(backButton)] });
        }
      } else if (collected.customId === 'help_back') {
        if (collected.values[0] === 'main_menu') {
          const mainMenuEmbed = createCategoryEmbed(commandCategories.find((c) => c.name.toLowerCase() === 'general'));
          await collected.update({ embeds: [mainMenuEmbed], components: [new MessageActionRow().addComponents(selectMenu)] });
        } else {
          const category = commandCategories.find((c) => c.name.toLowerCase() === collected.values[0]);
          const categoryEmbed = createCategoryEmbed(category);
          await collected.update({ embeds: [categoryEmbed], components: [new MessageActionRow().addComponents(backButton)] });
        }
      }
    });

    collector.on('end', () => {
      interaction.followUp({ content: 'Category selection expired.', ephemeral: true });
    });

    const mainMenuEmbed = createCategoryEmbed(commandCategories.find((c) => c.name.toLowerCase() === 'general'));

    await interaction.reply({ embeds: [mainMenuEmbed], components: [new MessageActionRow().addComponents(selectMenu)] });
  },
};
