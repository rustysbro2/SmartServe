const { SlashCommandBuilder } = require('@discordjs/builders');
const { MusicPlayer } = require('../features/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song')
    .addStringOption((option) =>
      option.setName('url').setDescription('YouTube URL of the song').setRequired(true)
    ),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const channelId = interaction.member.voice.channelId;
    const url = interaction.options.getString('url');

    const musicPlayer = new MusicPlayer(guildId, channelId, interaction.channel);

    try {
      await musicPlayer.addSong(url);
      await interaction.reply(`Added song to the queue: ${url}`);
    } catch (error) {
      console.error('Error executing /play command:', error.message);
      await interaction.reply('Failed to add the song to the queue.');
    }
  },
};
