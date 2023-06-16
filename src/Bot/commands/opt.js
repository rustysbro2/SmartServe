const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('optout')
    .setDescription('Opt out of recurring reminders'),

  async execute(interaction) {
    const guild = interaction.guild;
    const member = guild.members.cache.get(interaction.user.id);

    try {
      // Update the database to mark the user as opted out
      await connection.query('UPDATE users SET opt_out = 1 WHERE user_id = ?', [member.id]);

      await interaction.reply("You have opted out of recurring reminders. You will no longer receive them.");
    } catch (error) {
      console.error('Error updating opt-out status:', error);
      await interaction.reply("An error occurred while updating your opt-out status. Please try again later.");
    }
  },
};
