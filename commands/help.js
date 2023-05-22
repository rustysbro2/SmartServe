const { SlashCommandBuilder } = require('@discordjs/builders');

const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),

  execute: async (interaction) => {
    const { commands } = interaction.client;

    const helpMessage = commands.map(command => {
      const commandName = command.data.name;
      const commandDescription = command.data.description;
      const commandOptions = command.data.options ? command.data.options.map(option => option.name).join(', ') : '';
      const usage = `/${commandName} ${commandOptions}`;

      return `**${commandName}**: ${commandDescription}\nUsage: \`${usage}\``;
    }).join('\n\n');

    interaction.reply(`**Available Commands**:\n\n${helpMessage}`);
  }
};

module.exports = {
  helpCommand
};
