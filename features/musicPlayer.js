const { entersState, joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
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
    this.currentSong = null;

    this.setupListeners();
  }

  setupListeners() {
    console.log('Setting up audio player listeners.');
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

    if (wasEmpty && this.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
      console.log('Queue was empty and audio player is not playing. Processing queue.');
      await this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      // If the bot is already in the voice channel and is the only member, leave it
      if (this.connection && this.connection.joinConfig.channelId) {
        const channel = this.connection.joinConfig.channelId;
        const members = this.connection.joinConfig.guildId
          ? this.connection.joinConfig.guildId.members.cache
          : null;

        if (channel && members && members.size === 1) {
          console.log(`Bot is the only member in the voice channel. Leaving channel.`);
          this.connection.destroy();
          this.connection = null;
          return;
        }
      }

      console.log('Queue is empty. Stopping playback.');
      return;
    }

    // The queue is not empty
    if (!this.connection) {
      // Bot is not in the voice channel, so join it
      await this.joinChannel();
    }

    // Process the queue and play songs
    while (this.queue.length > 0) {
      this.currentSong = this.queue.shift();
      console.log('Processing queue. Now playing:', this.currentSong);

      const stream = ytdl(this.currentSong, { filter: 'audioonly' });
      const resource = createAudioResource(stream);

      this.audioPlayer.play(resource);

      await entersState(this.audioPlayer, AudioPlayerStatus.Playing, 5e3);

      console.log('Now playing:', this.currentSong);

      await new Promise(resolve => setTimeout(resolve, 2000));

      this.sendNowPlaying();
    }
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
