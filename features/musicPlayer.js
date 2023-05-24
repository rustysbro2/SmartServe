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
    this.connection = null;
    this.isPlaying = false;
    this.setupListeners();
  }

  setupListeners() {
    this.audioPlayer.on('stateChange', async (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
        this.processQueue();
      }
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
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30e3);
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

    if (!this.isPlaying) {
      await this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.isPlaying = false;

      if (this.connection) {
        this.connection.destroy();
        this.connection = null;
      }

      return;
    }

    const url = this.queue.shift();
    const stream = ytdl(url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);

    this.audioPlayer.play(resource);
    this.isPlaying = true;

    await entersState(this.audioPlayer, AudioPlayerStatus.Playing, 5e3);
    
    // Send the "Now playing" message after the player transitions to the "Playing" state
    this.sendNowPlaying();
  }

  sendNowPlaying() {
    const currentSong = this.queue[0];
    const message = currentSong ? `Now playing: ${currentSong}` : 'The queue is empty.';
    this.textChannel.send(message);
  }
}

module.exports = MusicPlayer;
