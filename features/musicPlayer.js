const {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const ytdl = require('ytdl-core-discord');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.js');

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
    this.voiceChannelCheckInterval = null; // Initialize the property

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
      console.error('Audio player aborted:', error.aborted);
      console.error('Audio player state:', this.audioPlayer.state);
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
    if (this.queue.length === 0 && !this.isBotAlone()) {
      console.log('Queue is empty. Stopping playback.');
      return;
    }

    if (!this.connection) {
      await this.joinChannel();
    }

    while (this.queue.length > 0) {
      this.currentSong = this.queue.shift();
      console.log('Processing queue. Now playing:', this.currentSong);

      try {
        const stream = await ytdl(this.currentSong);
        const resource = createAudioResource(stream);
        this.audioPlayer.play(resource);

        await entersState(this.audioPlayer, AudioPlayerStatus.Playing, 5e3);

        if (this.currentSong !== this.queue[0]) {
          console.log('Now playing:', this.currentSong);
          this.sendNowPlaying();
        }

        // Reset voteSkips set
        this.voteSkips.clear();
      } catch (error) {
        console.error(`Failed to play the song: ${error.message}`);
      }
    }
  }

  isBotAlone() {
    const voiceChannelId = this.connection.joinConfig?.channelId;
    const guild = this.textChannel.guild;
    const voiceChannel = guild?.channels.cache.get(voiceChannelId);

    if (!voiceChannel) {
      console.log('Voice channel is undefined.');
      return false;
    }

    const members = voiceChannel.members;
    if (!members) {
      console.log('Members are undefined.');
      return false;
    }

    const botId = config.clientId; // Use the client ID from config.js
    const botMember = members.get(botId);
    const otherMembers = members.filter(member => !member.user.bot && member.id !== botId);
    return otherMembers.size === 0;
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
    if (this.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
      throw new Error('There is no song currently playing.');
    }

    if (this.voteSkips.has(member.id)) {
      throw new Error('You have already voted to skip the current song.');
    }

    this.voteSkips.add(member.id);

    const voiceConnection = this.connection;
    if (!voiceConnection) {
      throw new Error('The bot is not connected to a voice channel.');
    }

    const voiceChannelId = voiceConnection.joinConfig?.channelId;
    const guild = voiceConnection.joinConfig?.guildId ? this.textChannel.client.guilds.cache.get(voiceConnection.joinConfig.guildId) : null;
    const voiceChannel = guild ? guild.channels.cache.get(voiceChannelId) : null;

    console.log('voiceConnection:', voiceConnection);
    console.log('voiceChannel:', voiceChannel);

    if (!voiceChannel) {
      throw new Error('Failed to retrieve the voice channel.');
    }

    const members = voiceChannel.members;
    console.log('members:', members);

    if (!members) {
      throw new Error('Failed to retrieve the members in the voice channel.');
    }

    const totalCount = members.filter(member => !member.user.bot).size;

    if (!totalCount) {
      throw new Error('Failed to retrieve the total count of members in the voice channel.');
    }

    const voteCount = this.voteSkips.size;
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
    const embed = new EmbedBuilder()
      .setTitle('Vote Skip')
      .setDescription(`Vote skip: ${voteCount}/${totalCount} (${votePercentage.toFixed(2)}%)`)
      .setColor(0x0099FF);

    this.textChannel
      .send({ embeds: [embed] })
      .then(() => {
        console.log('Vote skip message sent.');
      })
      .catch((error) => {
        console.error(`Failed to send vote skip message: ${error.message}`);
      });
  }

  startVoiceChannelCheckInterval() {
    this.voiceChannelCheckInterval = setInterval(() => {
      this.checkVoiceChannel();
    }, 1000);
  }

  checkVoiceChannel() {
    if (!this.connection) {
      console.log('Bot is not connected to a voice channel.');
      return;
    }

    const voiceChannelId = this.connection.joinConfig?.channelId;
    const guild = this.textChannel.guild;
    const voiceChannel = guild?.channels.cache.get(voiceChannelId);

    if (!voiceChannel) {
      console.log('Voice channel is undefined or bot is not in a voice channel.');
      this.leaveVoiceChannel(); // Leave the voice channel if the bot is not in a valid voice channel
      return;
    }

    const members = voiceChannel.members;

    if (!members) {
      console.log('Members are undefined.');
      return;
    }

    const otherMembers = members.filter(member => !member.user.bot);

    if (otherMembers.size === 0) {
      console.log('Bot is alone in the voice channel. Leaving the channel.');
      this.leaveVoiceChannel(); // Leave the voice channel if the bot is alone
    } else {
      console.log('Bot is not alone in the voice channel.'); // Debug statement when the bot is not alone
    }
  }

  leaveVoiceChannel() {
    if (this.connection) {
      this.audioPlayer.stop();
      this.connection.destroy();
      this.connection = null;
      console.log('Bot left the voice channel.');

      clearInterval(this.voiceChannelCheckInterval); // Clear the voice channel check interval
    }
  }
}

module.exports = MusicPlayer;
