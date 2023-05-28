const {
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require('@discordjs/voice');
const { MessageEmbed } = require('discord.js');
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
    this.startVoiceChannelCheckInterval();
  }

  setupListeners() {
    this.audioPlayer.on(AudioPlayerStatus.Idle, async () => {
      console.log('Audio player state changed to Idle. Processing queue.');
      await this.processQueue();
    });

    this.audioPlayer.on('error', (error) => {
      console.error(`Error: ${error.message}`);
    });
  }

  async joinChannel() {
    const connectionData = {
      channelId: this.channelId,
      guildId: this.guildId,
      adapterCreator: this.textChannel.guild.voiceAdapterCreator,
    };

    this.connection = joinVoiceChannel(connectionData);

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30e3);
      console.log('Voice connection established.');
    } catch (error) {
      console.error(`Failed to join voice channel: ${error.message}`);
      this.connection.destroy();
      throw error;
    }

    this.connection.joinConfig = connectionData;
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
    if (!this.connection) {
      await this.joinChannel();
    }

    while (true) {
      try {
        if (this.queue.length === 0 && this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
          break;
        }

        if (this.queue.length > 0) {
          this.currentSong = this.queue.shift();
          console.log('Processing queue. Now playing:', this.currentSong);

          const stream = await ytdl(this.currentSong);
          const resource = createAudioResource(stream);
          this.audioPlayer.play(resource);

          await entersState(this.audioPlayer, AudioPlayerStatus.Playing, 5e3);

          if (this.currentSong !== this.queue[0]) {
            console.log('Now playing:', this.currentSong);
            this.sendNowPlaying();
          }

          this.voteSkips.clear();
        }
      } catch (error) {
        console.error(`Failed to play the song: ${error.message}`);
        break;
      }
    }

    if (this.queue.length === 0 && this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
      if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        console.log('Queue is empty and no songs are playing. Stopping playback and leaving voice channel.');

        const voiceChannel = this.connection.joinConfig?.guild?.channels.cache.get(
          this.connection.joinConfig?.channelId
        );
        if (
          voiceChannel &&
          voiceChannel.members.size === 1 &&
          voiceChannel.members.has(this.connection.joinConfig?.adapterCreator.userId)
        ) {
          console.log(`Bot is the only member in the voice channel: ${voiceChannel.name}`);
          this.audioPlayer.stop();
          this.connection.destroy();
          this.connection = null;
        } else {
          this.audioPlayer.stop();
        }
      }
    }
  }

  startVoiceChannelCheckInterval() {
    setInterval(() => {
      this.checkVoiceChannel();
    }, 1000);
  }

  checkVoiceChannel() {
    if (!this.connection) return;

    const voiceChannelId = this.connection.joinConfig?.channelId;
    const guild = this.textChannel.guild;
    const voiceChannel = guild?.channels.cache.get(voiceChannelId);

    if (!voiceChannel) {
      console.log('Voice channel is undefined.');
      return;
    }

    const members = voiceChannel.members;
    if (!members) {
      console.log('Members are undefined.');
      return;
    }

    if (
      members.size === 1 &&
      members.has(this.connection.joinConfig.adapterCreator.userId)
    ) {
      console.log(`Bot is the only member in the voice channel: ${voiceChannelId}`);
      this.audioPlayer.stop();
      this.connection.destroy();
      this.connection = null;
    }
  }

  sendNowPlaying() {
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

    const votePercentage = (voteCount / totalCount) * 100;
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

    const votePercentage = (voteCount / totalCount) * 100;
    const message = new MessageEmbed()
      .setColor('#FF0000')
      .setTitle('Vote Skip')
      .setDescription(`Vote skip initiated. Votes: ${voteCount}/${totalCount} (${votePercentage.toFixed(2)}%)`)
      .setTimestamp();

    this.textChannel.send({ embeds: [message] });
  }

  clearQueue() {
    if (this.queue.length === 0) {
      throw new Error('The queue is already empty.');
    }

    this.queue = [];
    console.log('Queue cleared.');
  }
}

module.exports = MusicPlayer;
