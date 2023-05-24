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
      console.log('Executing /play command...');
      const url = interaction.options.getString('url');
      console.log('URL:', url);
      const guildId = interaction.guildId;
      console.log('Guild ID:', guildId);
      const channelId = interaction.member.voice.channelId;
      console.log('Channel ID:', channelId);
      const textChannel = interaction.channel;

      // The member who sent the command must be in a voice channel
      if (!channelId) {
        console.log('User not in a voice channel.');
        return await interaction.reply('You must be in a voice channel to play music!');
      }

      // Create or retrieve the music player for this guild
      let musicPlayer = client.musicPlayers.get(guildId);
      if (!musicPlayer) {
        console.log('Creating new MusicPlayer instance.');
        musicPlayer = new MusicPlayer(guildId, channelId, textChannel);
        client.musicPlayers.set(guildId, musicPlayer);
        await musicPlayer.joinChannel();
      }

      const wasEmpty = musicPlayer.queue.length === 0; // Check if the queue was empty before adding the song
      console.log('Queue was empty before adding song:', wasEmpty);
      await musicPlayer.addSong(url);

      if (wasEmpty && musicPlayer.queue.length === 1) {
        console.log('Waiting for AudioPlayer to transition to "Playing" state...');
        await entersState(musicPlayer.audioPlayer, AudioPlayerStatus.Playing, 5e3);
        musicPlayer.sendNowPlaying();
        console.log('Now playing message sent.');
      }

      // Notify the user
      console.log('Sending reply message: Added to queue!');
      await interaction.reply('Added to queue!');
    } catch (error) {
      console.error(`Error executing /play command: ${error.message}`);
      await interaction.reply('There was an error while executing this command!');
    }
  },
};
