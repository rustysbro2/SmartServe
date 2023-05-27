const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute(interaction) {
    if (interaction.deferred || interaction.replied) {
      // Interaction has already been replied to or deferred
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('category')
      .setPlaceholder('Select a category');

    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('General')
        .setDescription('General commands')
        .setValue('general'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Moderation')
        .setDescription('Commands for moderation')
        .setValue('moderation'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Fun')
        .setDescription('Fun commands')
        .setValue('fun')
    );

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({
      content: 'Please select a category:',
      components: [row]
    });
  }
};
