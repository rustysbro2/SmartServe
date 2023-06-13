const { SlashCommandBuilder } = require('discord.js');
const { updateVoteReminderOptOut } = require('../features/voteRemind');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('optout')
    .setDescription('Opt-out or opt-in to receiving vote reminders')
    .addBooleanOption(option => option
      .setName('opt')
      .setDescription('Choose whether to opt-out or opt-in')
      .setRequired(true)),

  async execute(interaction) {
    try {
      const guildId = interaction.guild.id;
      const memberId = interaction.user.id;
      const optOut = interaction.options.getBoolean('opt');

      // Update the opt-out status in the database
      await updateVoteReminderOptOut(guildId, memberId, optOut);

      const response = optOut ? 'You have opted out of receiving vote reminders.' : 'You have opted back in to receiving vote reminders.';
      await interaction.reply(response);

    } catch (error) {
      console.error('Error executing opt-out command:', error);
      await interaction.reply('An error occurred while processing your request.');
    }
  }
};
