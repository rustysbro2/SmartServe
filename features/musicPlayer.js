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
    console.log('Creating new MusicPlayer instance.');
    this.guildId = guildId;
    this.channelId = channelId;
    this.textChannel = textChannel;
    this.queue = [];
    this.audioPlayer = createAudioPlayer();
    this.connection = null;
    this.currentSong = null;  // New Line Added

    this.setupListeners();
  }

  setupListeners() {
    console.log('Setting up audio player listeners.');
    this.audioPlayer.on('stateChange', (oldState, newState) => {
      console.log(`State change: ${oldState.status} -> ${newState.status}`);
      if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
        console.log('Audio player state changed to Idle. Processing queue.');
        this.processQueue();
      } else if (newState.status === AudioPlayerStatus.Playing && oldState.status !== AudioPlayerStatus.Playing) {
        console.log('Audio player state changed to Playing. Sending Now Playing message...');
        this.sendNowPlaying();
      }
    });

    this.audioPlayer.on('error', (error) => {
      console.error(`Error: ${error.message}`);
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
    console.log('Validating YouTube URL:', url);
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return pattern.test(url);
  }

  async addSong(url) {
    console.log('Adding song to queue:', url);
    if (!this.isValidYoutubeUrl(url)) {
      throw new Error('Invalid YouTube URL');
    }

    const wasEmpty = this.queue.length === 0;
    this.queue.push(url);

    // This line is new
    if (wasEmpty) this.currentSong = url;

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
      }
      console.log('Queue is empty. Stopping playback.');
      return;
    }

    // This is new - the current song will always be the one at the front of the queue
    this.currentSong = this.queue.shift();
    console.log('Processing queue. Now playing:', this.currentSong);

    const stream = ytdl(this.currentSong, { filter: 'audioonly' });
    const resource = createAudioResource(stream);

    this.audioPlayer.play(resource);

    await entersState(this.audioPlayer, AudioPlayerStatus.Playing, 5e3);

    console.log('Now playing:', this.currentSong);

    // Introduce a delay before sending the "Now playing" message
    await new Promise(resolve => setTimeout(resolve, 2000));

    this.sendNowPlaying(); // Send the "Now playing" message after the delay
  }

  sendNowPlaying() {
    if (this.currentSong) {
      console.log('Sending Now Playing message:', this.currentSong);
      const message = `Now playing: ${this.currentSong}`;
      this.textChannel.send(message).then(() => {
        console.log('Now Playing message sent:', this.currentSong);
      }).catch((error) => {
        console.error(`Failed to send Now Playing message: ${error.message}`);
      });
    }
  }
}

module.exports = MusicPlayer;
