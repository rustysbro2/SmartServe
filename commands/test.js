const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Set status'),
    async execute(interaction, client) {
        const actionRow = new ActionRowBuilder()
        .addComponents(
            new SelectMenuBuilder()
            .setCustomId('set-status')
            .setPlaceholder('Nothing is selected.')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions([
                {
                    label: `online`,
                    description: `Online status.`,
                    value: `online`
                },
                {
                    label: `idle`,
                    description: `Idle status.`,
                    value: `idle`
                },
                {
                    label: `dnd`,
                    description: `Do Not Disturb status.`,
                    value: `dnd`
                },
                {
                    label: `invisible`,
                    description: `Invisible status.`,
                    value: `invisible`
                },
            ])
        );

        await interaction.reply({ content: `Status? `, components: [actionRow] });
    },
};
