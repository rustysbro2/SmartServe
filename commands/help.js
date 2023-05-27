const { SlashCommandBuilder, SelectMenuBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction, client) {
    const commandList = client.commands.map((command) => ({
      name: command.data.name,
      description: command.data.description,
    }));

    const selectMenu = new SelectMenuBuilder()
      .setCustomId('command_help')
      .setPlaceholder('Select a command');

    commandList.forEach((command) => {
      selectMenu.addOption((option) =>
        option
          .setLabel(command.name)
          .setDescription(command.description)
          .setValue(command.name)
      );
    });

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: 'Please select a command to get more information:',
      components: [actionRow],
    });
  },
};
