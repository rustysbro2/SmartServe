const { SlashCommandBuilder } = require('@discordjs/builders');
const { CommandInteraction, Client } = require('discord.js');
const { setStrikeChannel } = require('../../features/strikeLogic');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setstrikechannel')
        .setDescription('Set the channel for strike notifications.')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel for strike notifications.')
                .setRequired(true)),
    
    /**
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');

        if (await setStrikeChannel(interaction.guild.id, channel.id)) {
            interaction.reply(`Strike channel has been set to <#${channel.id}>.`);
        } else {
            interaction.reply('Failed to set strike channel.');
        }
    }
};
