const { SlashCommandBuilder } = require('discord.js');
const { updateVoteReminderOptOut } = require('../features/voteRemind');

const optOutCommand = {
  data: new SlashCommandBuilder()
    .setName('optout')
    .setDescription('Opt-out or opt-in to receiving vote reminders')
    .addBooleanOption(option => option
      .setName('opt')
      .setDescription('Choose whether to opt-out or opt-in')
      .setRequired(true)),
  async execute(interaction) {
    // Extract the option value
    const optOutValue = interaction.options.getBoolean('opt');

    // Call the function to update the vote reminder opt-out status
    await updateVoteReminderOptOut(interaction.user.id, optOutValue);

    // Respond to the user with a message
    await interaction.reply({
      content: `Vote reminder opt-out status has been updated to ${optOutValue}`,
      ephemeral: true
    });
  }
};

module.exports = optOutCommand;
