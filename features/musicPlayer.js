const {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const { demuxProbe } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { Readable } = require('stream');

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
    this.audioPlayer.on(AudioPlayerStatus.Idle, async () => {
      if (this.queue.length === 0) {
        console.log('Queue is empty. Stopping playback.');
        await this.connection.destroy();
        this.connection = null;
        this.currentSong = null;
        return;
      }

      await this.playNextSong();
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

  async addSong(url) {
    if (!ytdl.validateURL(url)) {
      throw new Error('Invalid YouTube URL');
    }

    this.queue.push(url);

    if (!this.connection) {
      await this.joinChannel();
    }

    if (this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
      await this.playNextSong();
    }
  }

  async playNextSong() {
    this.currentSong = this.queue.shift();
    console.log('Processing queue. Now playing:', this.currentSong);

    const stream = ytdl(this.currentSong, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25, // 32MB
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });

    this.audioPlayer.play(resource);

    console.log('Now playing:', this.currentSong);
    this.sendNowPlaying();

    // Reset voteSkips set
    this.voteSkips.clear();
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
