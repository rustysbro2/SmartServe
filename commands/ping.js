const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Command category')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.reply('Pong!');
  },
  category: 'Main Menu', // Set the command category
  categoryDescription: 'Main menu commands' // Set the category description
};
