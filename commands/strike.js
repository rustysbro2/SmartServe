const { SlashCommandBuilder } = require('discord.js');
const { logStrike } = require('../features/strikeFeature');
const pool = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Log a strike for a user')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to strike')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('The reason for the strike')
        .setRequired(true)
    ),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.options.getUser('user').id;
    const reason = interaction.options.getString('reason');

    try {
      await logStrike(pool, guildId, userId, reason);
      await interaction.reply(`Strike logged for user <@${userId}>. Reason: ${reason}`);
    } catch (error) {
      console.error('Error logging strike:', error);
      await interaction.reply('An error occurred while logging the strike.');
    }
  },
};
