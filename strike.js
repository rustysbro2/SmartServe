// commands/strike.js

const { SlashCommandBuilder } = require('discord.js');
const strikeFeature = require('../features/strikeFeature');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Manage strikes for a user')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a strike to a user')
        .addUserOption(option =>
          option.setName('user').setDescription('Select the user').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('Enter the reason for the strike').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove the latest strike from a user')
        .addUserOption(option =>
          option.setName('user').setDescription('Select the user').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all strikes of a user')
        .addUserOption(option =>
          option.setName('user').setDescription('Select the user').setRequired(true)
        )
    ),
  async execute(interaction) {
    await strikeFeature.execute(interaction.client, interaction);
  },
};
