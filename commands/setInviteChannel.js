// commands/setInviteChannel.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const inviteTracker = require('../features/inviteTracker.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setinvitechannel')
        .setDescription('Set the channel for invite tracking messages')
        .addChannelOption(option => option.setName('channel').setDescription('The channel to send messages in').setRequired(true)),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        inviteTracker.setInviteChannel(interaction.guildId, channel.id);
        await interaction.reply({ content: `Invite tracking messages will be sent in ${channel.name}`, ephemeral: true });
    },
};
