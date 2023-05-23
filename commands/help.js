// commands/help.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('helps')
        .setDescription('List all commands or info about a specific command.'),
    async execute(interaction) {
        const commands = interaction.client.commands;
        const helpEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Help')
            .setDescription('Here are the available commands:');
        
        commands.forEach((value, key) => {
            helpEmbed.addField(key, value.data.description);
        });

        return interaction.reply({ embeds: [helpEmbed] });
    },
};
