const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Set status'),
  
  async execute(interaction, client) {
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('set-status')
          .setPlaceholder('Nothing is selected.')
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions([
            {
              label: 'Online',
              description: 'Online status.',
              value: 'online'
            },
            {
              label: 'Idle',
              description: 'Idle status.',
              value: 'idle'
            },
            {
              label: 'Do Not Disturb',
              description: 'Do Not Disturb status.',
              value: 'dnd'
            },
            {
              label: 'Invisible',
              description: 'Invisible status.',
              value: 'invisible'
            },
          ])
      );

    await interaction.reply({ content: 'Status?', components: [actionRow] });
  },
};
