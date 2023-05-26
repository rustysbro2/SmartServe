const { AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const ytdl = require('ytdl-core');

class MusicPlayer {
  constructor(guildId, channelId, textChannel) {
    this.guildId = guildId;
    this.channelId = channelId;
    this.textChannel = textChannel;
    this.queue = [];
    this.audioPlayer = createAudioPlayer();
    this.connection = null;
    this.currentSong = null;
    this.voteSkips = new Set();
    this.voteSkipThreshold = 0.5;

    this.setupListeners();
  }

  setupListeners() {
    this.audioPlayer.on('stateChange', async (oldState, newState) => {
      console.log(`State change: ${oldState.status} -> ${newState.status}`);
      if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
        console.log('Audio player state changed to Idle. Processing queue.');
        await this.processQueue();
      } else if (newState.status === AudioPlayerStatus.AutoPaused && oldState.status !== AudioPlayerStatus.AutoPaused) {
        console.log('Audio player state changed to Autopaused. Resuming playback.');
        this.audioPlayer.unpause();
      }
    });

    this.audioPlayer.on('error', (error) => {
      console.error(`Error: ${error.message}`);
    });
  }

  async joinChannel() {
    this.connection = joinVoiceChannel({
      channelId: this.channelId,
      guildId: this.guildId,
      adapterCreator: this.textChannel.guild.voiceAdapterCreator,
    });

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30e3);
      console.log('Voice connection established.');
    } catch (error) {
      console.error(`Failed to join voice channel: ${error.message}`);
      this.connection.destroy();
      throw error;
    }

    this.connection.subscribe(this.audioPlayer);
  }

  isValidYoutubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return pattern.test(url);
  }

  async addSong(url) {
    if (!this.isValidYoutubeUrl(url)) {
      throw new Error('Invalid YouTube URL');
    }

    const wasEmpty = this.queue.length === 0;
    this.queue.push(url);

    if (wasEmpty && this.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
      console.log('Queue was empty and audio player is not playing. Processing queue.');
      await this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      if (this.connection) {
        this.connection.destroy();
        this.connection = null;
        console.log('Bot left the voice channel.');
      }
      console.log('Queue is empty. Stopping playback.');
      return;
    }

    if (!this.connection) {
      await this.joinChannel();
    }

    while (this.queue.length > 0) {
      this.currentSong = this.queue.shift();
      console.log('Processing queue. Now playing:', this.currentSong);

      const stream = ytdl(this.currentSong, { filter: 'audioonly' });
      const resource = createAudioResource(stream);
      this.audioPlayer.play(resource);

      await entersState(this.audioPlayer, AudioPlayerStatus.Playing, 5e3);

      console.log('Now playing:', this.currentSong);
      this.sendNowPlaying();

      // Reset voteSkips set
      this.voteSkips.clear();

      // Wait for the song to finish playing
      await entersState(this.audioPlayer, AudioPlayerStatus.Idle, 5e3);
    }
  }

  sendNowPlaying() {
    if (this.currentSong) {
      console.log('Sending Now Playing message:', this.currentSong);
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('Now Playing')
        .setDescription(`Now playing: [${this.currentSong}](${this.currentSong})`);

      this.textChannel
        .send({ embeds: [embed] })
        .then(() => {
          console.log('Now Playing message sent:', this.currentSong);
        })
        .catch((error) => {
          console.error(`Failed to send Now Playing message: ${error.message}`);
        });
    }
  }
}

module.exports = MusicPlayer;
