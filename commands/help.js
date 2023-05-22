const { SlashCommandBuilder } = require('@discordjs/builders');

const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),

  execute: async (interaction) => {
    const { commands } = interaction.client;

    const helpMessage = commands.map(command => {
      const commandData = command.data;
      const commandName = commandData.name;
      const commandDescription = commandData.description;
      const commandOptions = commandData.options ? commandData.options.map(option => option.name).join(', ') : '';
      const usage = `/${commandName} ${commandOptions}`;

      return `**${commandName}**: ${commandDescription}\nUsage: \`${usage}\``;
    }).join('\n\n');

    await interaction.reply(`**Available Commands**:\n\n${helpMessage}`);
  },
};

module.exports = helpCommand;
