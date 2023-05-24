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
    this.audioPlayer.on('stateChange', (oldState, newState) => {
      console.log(`State change: ${oldState.status} -> ${newState.status}`);
      if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
        this.processQueue();
      } else if (newState.status === AudioPlayerStatus.Playing) {
        console.log('Now playing...');
        this.sendNowPlaying();
      }
    });

    this.audioPlayer.on('error', (error) => {
      console.error(`Audio player error: ${error.message}`);
      this.textChannel.send(`Error: ${error.message}`);
    });
  }

  async joinChannel() {
    console.log('Joining voice channel...');
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
    console.log('Voice connection established.');
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
      console.log('Processing queue after adding song...');
      await this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      if (this.connection) {
        if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
          this.connection.destroy();
        }
        this.connection = null;
      }
      return;
    }

    const url = this.queue.shift();
    const stream = ytdl(url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);

    this.audioPlayer.play(resource);

    await entersState(this.audioPlayer, AudioPlayerStatus.Playing, 5e3);
  }

  sendNowPlaying() {
    const currentSong = this.queue[0];
    if (currentSong) {
      const message = `Now playing: ${currentSong}`;
      this.textChannel.send(message);
    } else {
      console.log('No song is currently playing.');
    }
  }
}

module.exports = MusicPlayer;
