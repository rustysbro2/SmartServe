const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageEmbed, MessageSelectMenu } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command.'),

  async execute(interaction) {
    const commands = interaction.client.commands;

    // Define command categories and their respective commands
    const commandCategories = [
      {
        name: 'Music',
        commands: [
          { name: 'play', description: 'Play a song.' },
          { name: 'skip', description: 'Skip the current song.' },
        ],
      },
      {
        name: 'Invite Tracker',
        commands: [
          { name: 'setinvitechannel', description: 'Set the invite tracking channel.' },
        ],
      },
    ];

    // Create the help embed
    const helpEmbed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle('Help')
      .setDescription('Please select a category:');

    // Create the select menu with category options
    const selectMenu = new MessageSelectMenu()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    // Add options to the select menu based on command categories
    commandCategories.forEach(category => {
      const options = category.commands.map(command => ({
        label: command.name,
        value: command.name,
        description: command.description,
      }));

      selectMenu.addOptions({
        label: category.name,
        value: category.name,
        description: `Commands: ${options.map(option => option.label).join(', ')}`,
        options: options,
      });
    });

    // Create the action row with the select menu
    const actionRow = new MessageActionRow()
      .addComponents(selectMenu);

    // Reply with the help embed and action row
    const reply = await interaction.reply({ embeds: [helpEmbed], components: [actionRow] });

    // Store the message object from the reply
    const message = reply instanceof Message ? reply : reply.message;

    // Create a collector for the select menu interaction
    const collector = message.createMessageComponentCollector({
      componentType: 'SELECT_MENU',
      time: 60000, // 1 minute
      max: 1,
    });

    collector.on('collect', async (collectedInteraction) => {
      if (collectedInteraction.customId === 'help_category') {
        const selectedCategory = collectedInteraction.values[0];
        
        // Perform some action based on the selected category
        switch (selectedCategory) {
          case 'Music':
            await collectedInteraction.editReply('Perform some action here based on the Music category.', { components: [] });
            break;
          case 'Invite Tracker':
            await collectedInteraction.editReply('Perform some action here based on the Invite Tracker category.', { components: [] });
            break;
          default:
            await collectedInteraction.editReply('Invalid category selected.', { components: [] });
            break;
        }
      }
    });

    collector.on('end', async (collected) => {
      await message.edit({ content: 'Category selection expired.', components: [] });
    });
  },
};
