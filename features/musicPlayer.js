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
    this.currentSong = null;
    this.voteSkips = new Set();
    this.voteSkipThreshold = 0.5; // Change this value to set the required percentage of votes to skip a song

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

      await new Promise((resolve) => setTimeout(resolve, 2000));

      this.sendNowPlaying();
    }
  }

  sendNowPlaying() {
    if (this.currentSong) {
      console.log('Sending Now Playing message:', this.currentSong);
      const message = `Now playing: ${this.currentSong}`;
      this.textChannel
        .send(message)
        .then(() => {
          console.log('Now Playing message sent:', this.currentSong);
        })
        .catch((error) => {
          console.error(`Failed to send Now Playing message: ${error.message}`);
        });
    }
  }

async voteSkip(member) {
  if (!this.connection || this.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
    throw new Error('There is no song currently playing.');
  }

  const voiceChannel = this.connection.joinConfig.channelId;
  if (!voiceChannel) {
    throw new Error('The bot is not in a voice channel.');
  }

  const guild = this.textChannel.guild;
  if (!guild) {
    throw new Error('Failed to retrieve the guild.');
  }

  const members = guild.members.cache;
  if (!members || members.size === 1) {
    throw new Error('There are no other members in the voice channel.');
  }

  if (this.voteSkips.has(member.id)) {
    throw new Error('You have already voted to skip the current song.');
  }

  this.voteSkips.add(member.id);

  const voteCount = this.voteSkips.size;
  const totalCount = members.size - 1; // Exclude the bot

  const votePercentage = voteCount / totalCount;
  if (votePercentage >= this.voteSkipThreshold) {
    console.log('Vote skip threshold reached. Skipping the current song.');
    this.audioPlayer.stop();
    this.sendVoteSkipMessage();
  } else {
    console.log(`Received vote skip from ${member.user.tag}. Vote count: ${voteCount}/${totalCount}`);
    this.sendVoteSkipMessage();
  }
}




  sendVoteSkipMessage() {
    const voteCount = this.voteSkips.size;
    const totalCount = this.textChannel.guild?.members.cache.size - 1; // Exclude the bot

    if (totalCount === undefined) {
      throw new Error('Failed to retrieve the total count of members.');
    }

    const message = `Vote skip: ${voteCount}/${totalCount}`;
    this.textChannel
      .send(message)
      .then(() => {
        console.log('Vote skip message sent.');
      })
      .catch((error) => {
        console.error(`Failed to send vote skip message: ${error.message}`);
      });
  }
}

module.exports = MusicPlayer;
