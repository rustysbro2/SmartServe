const { SlashCommandBuilder } = require('@discordjs/builders');

const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),

  execute: async (interaction) => {
    const { commands } = interaction.client;

    // Assume commands are objects with `category` property
    const categories = {};
    commands.forEach(command => {
      const category = command.category || 'General';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(command);
    });

    let helpMessage = '';
    for (const category in categories) {
      helpMessage += `**${category}**\n`;

      const categoryCommands = categories[category].map(command => {
        const commandName = command.data.name;
        const commandDescription = command.data.description;
        const commandOptions = command.data.options ? command.data.options.map(option => option.name).join(', ') : '';
        const usage = `/${commandName} ${commandOptions}`;

        return `> **${commandName}**: ${commandDescription}\n> Usage: \`${usage}\``;
      }).join('\n\n');

      helpMessage += `${categoryCommands}\n\n`;
    }

    await interaction.reply(`**Available Commands**:\n\n${helpMessage}`);
  }
};

module.exports = helpCommand;
