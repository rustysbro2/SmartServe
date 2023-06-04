// commands/strike.js

const { SlashCommandBuilder } = require('discord.js');
const strikeFeature = require('../features/strikeFeature');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Manage strikes for a user')
    .addSubcommand(subcommand =>
      subcommand
        .setName('manage')
        .setDescription('Manage strikes for a user')
        .addUserOption(option =>
          option.setName('user').setDescription('Select the user').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('action').setDescription('Select the action').setRequired(true)
            .addChoice('Add', 'add')
            .addChoice('Remove', 'remove')
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('Enter the reason for the strike').setRequired(true)
        )
    ),
  async execute(interaction) {
    await strikeFeature.execute(interaction.client, interaction);
  },
};
