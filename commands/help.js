const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require('discord.js');

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

          const replyMessage = await interaction.fetchReply();
          if (replyMessage && replyMessage instanceof Message) {
            replyMessage.edit({ embeds: [categoryEmbed] });
          }
        }
      }
    });

    collector.on('end', () => {
      interaction.followUp({ content: 'Category selection expired.', ephemeral: true });
    });

    await interaction.reply({ embeds: [helpEmbed], components: [new MessageActionRow().addComponents(selectMenu)] });
  },
};
