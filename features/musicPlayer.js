// musicPlayer.js
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { MessageEmbed } = require('discord.js');

class MusicPlayer {
    constructor(client, channelId) {
        this.client = client;
        this.channelId = channelId;
        this.queue = [];
        this.player = createAudioPlayer();
        this.connection = null;
        this.player.on('idle', () => {
            if(this.queue.length > 0) {
                this.play(this.queue.shift());
            } else if(this.connection) {
                this.connection.destroy();
                this.connection = null;
            }
        });
    }

    async join(channelId) {
        const channel = await this.client.channels.fetch(channelId);
        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        this.connection.subscribe(this.player);
        try {
            await entersState(this.connection, VoiceConnectionStatus.Ready, 20e3);
        } catch (error) {
            this.connection.destroy();
            throw error;
        }
    }

    async play(url) {
        const stream = ytdl(url, { filter: 'audioonly' });
        const resource = createAudioResource(stream);
        this.player.play(resource);
    }

    enqueue(url) {
        this.queue.push(url);
    }
}

module.exports = MusicPlayer;