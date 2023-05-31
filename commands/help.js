const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const { guildId } = require('../config.js');

async function handleSelectMenu(interaction, commandCategories) {
    const selectedCategory = interaction.values[0];
    const category = commandCategories.find(category => category.name.toLowerCase().replace(/\s/g, '_') === selectedCategory);

    if (category) {
        const categoryEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Commands - ${category.name}`);

        if (category.categoryDescription && category.categoryDescription.length > 0) {
            categoryEmbed.setDescription(category.categoryDescription);
        }

        const guildSpecificCommands = category.commands.filter(command => command.guildId === interaction.guildId);
        const globalCommands = category.commands.filter(command => command.global !== false);

        const commandsToShow = guildSpecificCommands.length > 0 ? guildSpecificCommands : globalCommands;

        commandsToShow.forEach(command => {
            categoryEmbed.addFields({ name: command.name, value: command.description });
        });

        if (interaction.message) {
            const actionRow = new ActionRowBuilder().addComponents(...interaction.message.components[0].components);
            await interaction.deferUpdate();
            await interaction.message.edit({ embeds: [categoryEmbed], components: [actionRow] });
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('List all commands or info about a specific command'),

    async execute(interaction, client, commandCategories) {
        const isGlobal = !guildId || (interaction.guildId && interaction.guildId === guildId);

        const filteredCommandCategories = commandCategories
            .filter(category => isGlobal ? !category.guildId : category.guildId === interaction.guildId)
            .slice(0, 10);

        const usedOptionValues = new Set();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Select a category');

        filteredCommandCategories.forEach(category => {
            if (category.commands.some(command => command.global !== false || (isGlobal && command.guildId === guildId))) {
                const optionValue = category.name.toLowerCase().replace(/\s/g, '_');
                if (!usedOptionValues.has(optionValue)) {
                    selectMenu.addOptions(new StringSelectMenuOptionBuilder()
                        .setLabel(category.name)
                        .setValue(optionValue)
                        .setDescription(category.categoryDescription));
                    usedOptionValues.add(optionValue);
                }
            }
        });

        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ content: 'Select a command category.', components: [actionRow], ephemeral: true });
    },

    async handleSelectMenu(interaction, client, commandCategories) {
        await handleSelectMenu(interaction, commandCategories);
    }
};
