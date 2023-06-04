const { SlashCommandBuilder } = require('discord.js');
const { addStrike } = require('../features/strikeFeature');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Strike a user')
    .addUserOption(option =>
      option.setName('user').setDescription('Select a user').setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Enter the reason for the strike')
        .setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    // Call the addStrike function from the strikeFeature
    await addStrike(user.id, reason);

    await interaction.reply(`User ${user.tag} has been struck with reason: ${reason}`);
  },
};
