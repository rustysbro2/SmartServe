const { SlashCommandBuilder } = require('@discordjs/builders');
const MusicPlayer = require('../features/musicPlayer.js');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption(option =>
      option
        .setName('url')
        .setDescription('The YouTube URL of the song to play')
        .setRequired(true)),
  async execute(interaction, client) {
    try {
      const url = interaction.options.getString('url');
      const guildId = interaction.guildId;
      const channelId = interaction.member.voice.channelId;
      const textChannel = interaction.channel;

      // The member who sent the command must be in a voice channel
      if (!channelId) {
        return await interaction.reply('You must be in a voice channel to play music!');
      }

      // Create or retrieve the music player for this guild
      let musicPlayer = client.musicPlayers.get(guildId);
      if (!musicPlayer) {
        musicPlayer = new MusicPlayer(guildId, channelId, textChannel);
        client.musicPlayers.set(guildId, musicPlayer);
        await musicPlayer.joinChannel();
      }

      const wasEmpty = musicPlayer.queue.length === 0; // Check if the queue was empty before adding the song
      await musicPlayer.addSong(url);

      // Notify the user
      await interaction.reply('Added to queue!');

      if (wasEmpty && musicPlayer.audioPlayer.state.status === AudioPlayerStatus.Playing) {
        // Send the "Now playing" message if a song is already playing
        musicPlayer.sendNowPlaying();
      }
    } catch (error) {
      console.error('An error occurred while executing the /play command:', error);
      await interaction.reply('There was an error while executing this command!');
    }
  },
};
