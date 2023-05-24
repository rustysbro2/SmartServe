const { SlashCommandBuilder } = require('@discordjs/builders');
const { entersState } = require('@discordjs/voice');
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

    if (wasEmpty) {
      if (musicPlayer.queue.length === 1) {
        // If the queue was empty and the current song is the first one, wait for the player to transition to the "Playing" state
        await entersState(musicPlayer.audioPlayer, AudioPlayerStatus.Playing, 5e3);

        // Send the "Now playing" message
        musicPlayer.sendNowPlaying();
      } else {
        // If the queue was empty but the current song is not the first one, simply reply with "Added to queue"
        await interaction.reply('Added to queue!');
      }
    } else {
      // If the queue was not empty, simply reply with "Added to queue"
      await interaction.reply('Added to queue!');
    }
  },
};
