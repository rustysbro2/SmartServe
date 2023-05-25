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

    // Create the main help embed
    const helpEmbed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle('Help')
      .setDescription('Please select a category:');

    // Create the select menu with category options
    const selectMenu = new MessageSelectMenu()
      .setCustomId('help_category')
      .setPlaceholder('Select a category');

    // Add options to the select menu based on command categories
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

    // Create a message component collector
    const collector = interaction.channel.createMessageComponentCollector({
      componentType: 'SELECT_MENU',
      time: 60000, // 60 seconds
    });

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

          const backButton = new MessageSelectMenu()
            .setCustomId('help_back')
            .setPlaceholder('Go back to main menu')
            .addOptions([
              { label: 'Main Menu', value: 'main_menu', description: 'Go back to the main menu' },
              { label: 'Music', value: 'music', description: 'View Music commands' },
              { label: 'Invite Tracker', value: 'invite_tracker', description: 'View Invite Tracker commands' },
            ]);

          await collected.update({ embeds: [categoryEmbed], components: [new MessageActionRow().addComponents(backButton)] });
        }
      } else if (collected.customId === 'help_back') {
        if (collected.values[0] === 'main_menu') {
          await interaction.editReply({ embeds: [helpEmbed], components: [new MessageActionRow().addComponents(selectMenu)] });
        } else if (collected.values[0] === 'music') {
          const musicCategory = commandCategories.find((c) => c.name === 'Music');

          const musicEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`Category: ${musicCategory.name}`)
            .setDescription(musicCategory.description);

          musicCategory.commands.forEach((command) => {
            musicEmbed.addField(command.name, command.description);
          });

          const backButton = new MessageSelectMenu()
            .setCustomId('help_back')
            .setPlaceholder('Go back to main menu')
            .addOptions([
              { label: 'Main Menu', value: 'main_menu', description: 'Go back to the main menu' },
              { label: 'Invite Tracker', value: 'invite_tracker', description: 'View Invite Tracker commands' },
            ]);

          await interaction.editReply({ embeds: [musicEmbed], components: [new MessageActionRow().addComponents(backButton)] });
        } else if (collected.values[0] === 'invite_tracker') {
          const inviteTrackerCategory = commandCategories.find((c) => c.name === 'Invite Tracker');

          const inviteTrackerEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`Category: ${inviteTrackerCategory.name}`)
            .setDescription(inviteTrackerCategory.description);

          inviteTrackerCategory.commands.forEach((command) => {
            inviteTrackerEmbed.addField(command.name, command.description);
          });

          const backButton = new MessageSelectMenu()
            .setCustomId('help_back')
            .setPlaceholder('Go back to main menu')
            .addOptions([
              { label: 'Main Menu', value: 'main_menu', description: 'Go back to the main menu' },
              { label: 'Music', value: 'music', description: 'View Music commands' },
            ]);

          await interaction.editReply({ embeds: [inviteTrackerEmbed], components: [new MessageActionRow().addComponents(backButton)] });
        }
      }
    });

    collector.on('end', () => {
      interaction.editReply({ content: 'Category selection expired.', components: [] });
    });

    await interaction.reply({ embeds: [helpEmbed], components: [new MessageActionRow().addComponents(selectMenu)] });
  },
};
