const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageEmbed, MessageSelectMenu } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command.'),

  async execute(interaction) {
    const commandCategories = [
      {
        name: 'Music',
        description: 'Commands related to music',
        commands: [
          { name: 'play', description: 'Play a song' },
          { name: 'stop', description: 'Stop the currently playing song' },
          { name: 'skip', description: 'Skip to the next song' },
        ],
      },
      {
        name: 'Invite Tracker',
        description: 'Commands related to invite tracking',
        commands: [
          { name: 'setinvitechannel', description: 'Set the invite tracking channel' },
          { name: 'trackinvites', description: 'Start tracking invites' },
        ],
      },
    ];

    const helpEmbed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle('Help')
      .setDescription('Please select a category:');

    const selectMenu = new MessageSelectMenu()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    commandCategories.forEach((category) => {
      const options = category.commands.map((command) => ({
        label: command.name,
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

    const backButton = new MessageSelectMenu()
      .setCustomId('help_back')
      .setPlaceholder('Go back to main menu');

    const components = [new MessageActionRow().addComponents(selectMenu)];

    await interaction.reply({ embeds: [helpEmbed], components: components });

    const collector = interaction.channel.createMessageComponentCollector({
      componentType: 'SELECT_MENU',
      time: 60000,
    });

    let previousSelection = 'main_menu';

    collector.on('collect', async (collected) => {
      if (collected.customId === 'help_category') {
        const selectedCategory = collected.values[0];
        const category = commandCategories.find((c) => c.name.toLowerCase() === selectedCategory);

        if (category) {
          const categoryEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`Category: ${category.name}`)
            .setDescription(category.description);

          category.commands.forEach((command) => {
            categoryEmbed.addField(command.name, command.description);
          });

          backButton.addOptions(createBackOptions(previousSelection));
          components[0].components = [backButton];
          await collected.update({ embeds: [categoryEmbed], components: components });

          previousSelection = selectedCategory;
        }
      } else if (collected.customId === 'help_back') {
        const selectedValue = collected.values[0];
        let categoryEmbed;

        if (selectedValue === 'main_menu') {
          categoryEmbed = helpEmbed;
        } else {
          const category = commandCategories.find((c) => c.name.toLowerCase() === selectedValue);
          categoryEmbed = createCategoryEmbed(category);
        }

        backButton.addOptions(createBackOptions(selectedValue));
        components[0].components = [backButton];
        await collected.update({ embeds: [categoryEmbed], components: components });

        previousSelection = selectedValue;
      }
    });

    collector.on('end', () => {
      interaction.editReply({ content: 'Category selection expired.', components: [] });
    });

    function createCategoryEmbed(category) {
      const categoryEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`Category: ${category.name}`)
        .setDescription(category.description);

      category.commands.forEach((command) => {
        categoryEmbed.addField(command.name, command.description);
      });

      return categoryEmbed;
    }

    function createBackOptions(selectedValue) {
      const backOptions = [
        { label: 'Main Menu', value: 'main_menu', description: 'Go back to the main menu' },
        { label: 'Music', value: 'music', description: 'View Music commands' },
        { label: 'Invite Tracker', value: 'invite_tracker', description: 'View Invite Tracker commands' },
      ];

      return backOptions.filter((option) => option.value !== selectedValue);
    }
  },
};
