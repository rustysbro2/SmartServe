const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),

  execute: async (interaction) => {
    const { commands } = interaction.client;

    const commandFields = commands.map(command => {
      const commandName = command.data.name;
      const commandDescription = command.data.description;
      const commandOptions = command.data.options ? command.data.options.map(option => option.name).join(', ') : '';
      const usage = `/${commandName} ${commandOptions}`;

      return { name: `**${commandName}**`, value: `${commandDescription}\nUsage: \`${usage}\`` };
    });

    const embed = new MessageEmbed()
      .setTitle('Available Commands')
      .addFields(commandFields)
      .setColor('#0099ff')
      .setFooter({ text: 'This is a footer' });  // Update this text as needed

    await interaction.reply({ embeds: [embed] });
  }
};

module.exports = helpCommand;
