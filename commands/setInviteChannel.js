// commands/setInviteChannel.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const inviteTracker = require('../features/inviteTracker.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setInviteChannel')
        .setDescription('Set the channel where invite notifications should be sent.')
        .addChannelOption(option => option.setName('channel').setDescription('The channel').setRequired(true)),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        inviteTracker.setInviteChannel(interaction.guild.id, channel.id);
        await interaction.reply(`Invite notifications will be sent in ${channel.name}.`);
    },
};
