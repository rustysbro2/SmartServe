const { SlashCommandBuilder } = require('@discordjs/builders');

const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands')
    .toJSON(), // Add .toJSON() to convert the command builder to JSON

  execute: async (interaction) => {
    const { commands } = interaction.client;

    const helpMessage = commands.map(command => {
      const commandName = command.name;
      const commandDescription = command.description;
      const commandOptions = command.options.map(option => option.name).join(', ');
      const usage = `/${commandName} ${commandOptions}`;

      return `**${commandName}**: ${commandDescription}\nUsage: \`${usage}\``;
    }).join('\n\n');

    interaction.reply(`**Available Commands**:\n\n${helpMessage}`);
  }
};

module.exports = {
  helpCommand
};
