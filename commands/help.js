const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),

  execute: async (interaction) => {
    const { commands } = interaction.client;

    // Create embed
    const embed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle('Available Commands')
      .setFooter('Use the navigation buttons to see more commands');

    // Create action row with buttons
    const row = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId('previous')
          .setLabel('Previous')
          .setStyle('SECONDARY'),
        new MessageButton()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle('SECONDARY')
      );

    // Add commands to embed
    commands.forEach(command => {
      const commandName = command.data.name;
      const commandDescription = command.data.description;
      const commandOptions = command.data.options ? command.data.options.map(option => `\`${option.name}\``).join(', ') : '';
      embed.addField(`**/${commandName}**`, `${commandDescription}\nOptions: ${commandOptions}`);
    });

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};

module.exports = helpCommand;
