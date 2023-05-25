// commands/countingCommand.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { CommandInteraction, MessageEmbed } = require('discord.js');
const { getCurrentCount, increaseCount } = require('../features/countingGame.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('count')
        .setDescription('Counting game command')
        .addIntegerOption(option => 
            option.setName('number')
                  .setDescription('The next number in the counting game')),
    async execute(interaction) {
        const number = interaction.options.getInteger('number');

        // If there is no number, just show the current count
        if (!number) {
            const currentCount = await getCurrentCount(interaction.guild.id);
            const embed = new MessageEmbed()
                .setTitle('Counting Game')
                .setDescription(`The current count is ${currentCount}`);
            return interaction.reply({ embeds: [embed] });
        }

        // If there is a number, try to increment the count
        const validCount = await increaseCount(interaction.guild.id, number);
        const embed = new MessageEmbed()
            .setTitle('Counting Game');

        if (validCount) {
            embed.setDescription(`The count has been increased to ${number}`);
        } else {
            embed.setDescription(`Invalid count! The count has been reset to 1`);
        }

        interaction.reply({ embeds: [embed] });
    },
};
