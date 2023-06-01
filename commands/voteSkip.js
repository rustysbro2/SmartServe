const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voteskip')
    .setDescription('Vote to skip the current song'),

  async execute(interaction, client) {
    const guildId = interaction.guild.id;
    const channelId = interaction.member.voice.channelId;
    const musicPlayer = client.musicPlayers.get(guildId);

    if (!musicPlayer || musicPlayer.channelId !== channelId) {
      await interaction.reply('You are not in the same voice channel as the bot.');
      return;
    }

    try {
      await musicPlayer.voteSkip(interaction.member);
      await interaction.reply('Your vote to skip the current song has been counted.');
    } catch (error) {
      console.error(error);
      await interaction.reply(`Failed to vote skip: ${error.message}`);
    }
  },

  category: 'Music',
  categoryDescription: 'Commands related to music functionality',
};
