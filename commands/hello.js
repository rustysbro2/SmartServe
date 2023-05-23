const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder().setName('hellos').setDescription('Replies with Hello!'),
    async execute(interaction) {
        await interaction.reply('Hello!');
    },
};
