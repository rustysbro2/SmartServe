const {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');

class MusicPlayer {
  constructor(guildId, channelId, textChannel) {
    this.guildId = guildId;
    this.channelId = channelId;
    this.textChannel = textChannel;
    this.queue = [];
    this.audioPlayer = createAudioPlayer();
    this.setupListeners();
  }

  setupListeners() {
    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      if (this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
        this.processQueue();
      }
    });

    this.audioPlayer.on(AudioPlayerStatus.Playing, () => {
      this.sendNowPlaying();
    });

    this.audioPlayer.on('error', (error) => {
      this.textChannel.send(`Error: ${error.message}`);
    });
  }

  async joinChannel() {
    this.connection = joinVoiceChannel({
      channelId: this.channelId,
      guildId: this.guildId,
      adapterCreator: this.textChannel.guild.voiceAdapterCreator,
    });

    try {
      await Promise.race([
        entersState(this.connection, VoiceConnectionStatus.Ready, 30e3),
        entersState(this.connection, VoiceConnectionStatus.Signalling, 30e3),
      ]);
    } catch (error) {
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
    if (wasEmpty) {
      await this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      if (this.connection) { // Check if connection exists
        if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) { // Check connection status
          this.connection.destroy();
        }
        this.connection = null; // Set connection to null
      }
      return;
    }

    const url = this.queue.shift();
    const stream = ytdl(url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);

    this.audioPlayer.play(resource);

    // Wait for the player to transition to the "Playing" state
    await entersState(this.audioPlayer, AudioPlayerStatus.Playing, 5e3);
  }

  sendNowPlaying() {
    const currentSong = this.queue[0];
    const message = currentSong ? `Now playing: ${currentSong}` : 'The queue is empty.';
    this.textChannel.send(message);
  }
}

module.exports = MusicPlayer;
