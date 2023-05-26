const { entersState, joinVoiceChannel, VoiceConnectionStatus, createAudioResource } = require('@discordjs/voice');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const ytdl = require('ytdl-core');

class MusicPlayer {
  constructor(guildId, channelId, textChannel) {
    this.guildId = guildId;
    this.channelId = channelId;
    this.textChannel = textChannel;
    this.queue = [];
    this.connection = null;
    this.currentSong = null;
  }

  async joinChannel() {
    this.connection = await joinVoiceChannel({
      channelId: this.channelId,
      guildId: this.guildId,
      adapterCreator: this.textChannel.guild.voiceAdapterCreator,
    });

    this.connection.subscribe(this.audioPlayer);

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30e3);
      console.log('Voice connection established.');
    } catch (error) {
      console.error(`Failed to join voice channel: ${error.message}`);
      this.connection.destroy();
      throw error;
    }
  }




  isValidYoutubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return pattern.test(url);
  }

  async addSong(url, requester) {
    if (!this.isValidYoutubeUrl(url)) {
      throw new Error('Invalid YouTube URL');
    }

    const song = {
      url: url,
      requester: requester,
    };

    this.queue.push(song);

    if (!this.currentSong) {
      this.playNext();
    } else {
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('Song Queued')
        .setDescription(`[${song.url}](${song.url})`)
        .addField('Requested by', song.requester);

      this.textChannel.send({ embeds: [embed] })
        .then(() => {
          console.log('Song queued:', song.url);
        })
        .catch((error) => {
          console.error(`Failed to send song queued message: ${error.message}`);
        });
    }
  }

  playNext() {
    if (this.queue.length === 0) {
      // Queue is empty, disconnect from the voice channel
      this.connection.disconnect();
      this.connection = null;
      this.currentSong = null;
      console.log('Bot left the voice channel.');
      return;
    }

    const song = this.queue.shift();
    this.currentSong = song.url;

    const stream = ytdl(song.url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);

    resource.playStream.on('end', () => {
      console.log('Finished playing:', this.currentSong);
      this.currentSong = null;
      this.playNext();
    });

    this.connection.subscribe(resource);
    this.connection.play(resource);

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('Now Playing')
      .setDescription(`[${song.url}](${song.url})`)
      .addField('Requested by', song.requester);

    this.textChannel.send({ embeds: [embed] })
      .then(() => {
        console.log('Now Playing message sent:', song.url);
      })
      .catch((error) => {
        console.error(`Failed to send Now Playing message: ${error.message}`);
      });
  }
}

module.exports = MusicPlayer;
