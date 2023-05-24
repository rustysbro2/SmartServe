const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageEmbed, MessageSelectMenu } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command.'),

  async execute(interaction) {
    const commands = interaction.client.commands;
    const commandCategories = [
      {
        name: 'Music',
        commands: [
          { name: 'play', description: 'Play a song.' },
          { name: 'voteskip', description: 'Vote to skip the current song.' },
        ],
      },
      {
        name: 'Invite Tracker',
        commands: [
          { name: 'setinvitechannel', description: 'Set the invite tracking channel.' },
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

    const actionRow = new MessageActionRow().addComponents(selectMenu);

    let currentMenu = 'main_menu';
    let prevMenuOptions = [];

    commandCategories.forEach((category) => {
      const options = category.commands.map((command) => ({
        label: command.name,
        value: command.name,
        description: command.description,
      }));

      selectMenu.addOptions({
        label: category.name,
        value: category.name,
        description: `Commands: ${options.map((option) => option.label).join(', ')}`,
        options: options,
      });

      if (category.name !== 'Main Menu') {
        prevMenuOptions.push({
          label: category.name,
          value: category.name,
        });
      }
    });

    await interaction.reply({ embeds: [helpEmbed], components: [actionRow] });

    const filter = (collectedInteraction) =>
      collectedInteraction.user.id === interaction.user.id;

    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      componentType: 'SELECT_MENU',
      time: 60000,
    });

    collector.on('collect', async (collectedInteraction) => {
      if (collectedInteraction.customId === 'help_category') {
        const selectedCategory = collectedInteraction.values[0];
        const categoryCommands = commandCategories.find(
          (category) => category.name === selectedCategory
        );

        const categoryEmbed = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`Category: ${selectedCategory}`)
          .setDescription('Here are the commands in this category:');

        categoryCommands.commands.forEach((command) => {
          categoryEmbed.addField(command.name, command.description);
        });

        const backButton = new MessageSelectMenu()
          .setCustomId('help_back')
          .setPlaceholder('Go back to main menu')
          .addOptions(prevMenuOptions);

        const categoryActionRow = new MessageActionRow().addComponents(backButton);

        await collectedInteraction.update({
          embeds: [categoryEmbed],
          components: [categoryActionRow],
        });

        currentMenu = selectedCategory;
      } else if (collectedInteraction.customId === 'help_back') {
        let menuEmbed, menuActionRow;
        if (currentMenu === 'main_menu') {
          menuEmbed = helpEmbed;
          menuActionRow = actionRow;
        } else {
          menuEmbed = helpEmbed;
          menuActionRow = new MessageActionRow().addComponents(selectMenu);
          currentMenu = 'main_menu';
        }

        await collectedInteraction.update({
          embeds: [menuEmbed],
          components: [menuActionRow],
        });
      }
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        interaction.followUp({
          content: 'Category selection expired.',
          embeds: [helpEmbed],
          components: [actionRow],
        });
      }
    });
  },
};
