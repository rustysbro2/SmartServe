const { SlashCommandBuilder } = require('@discordjs/builders');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Get the vote link and manage vote reminders')
    .addStringOption(option =>
      option.setName('reminder')
        .setDescription('Choose to opt in or out of vote reminders')
        .addChoices(
          { name: 'Opt In', value: 'optin' },
          { name: 'Opt Out', value: 'optout' },
        )),
  async execute(interaction) {
    const option = interaction.options.getString('reminder');

    if (option === 'optin') {
      // TODO: Implement the logic to opt in to vote reminders
      await interaction.reply('You have opted in to vote reminders.');
    } else if (option === 'optout') {
      // TODO: Implement the logic to opt out of vote reminders
      await interaction.reply('You have opted out of vote reminders.');
    } else {
      const voteLink = `https://top.gg/bot/${process.env.BOT_ID}/vote`;
      await interaction.reply(`Vote for the bot here: ${voteLink}`);
    }
  },
};
