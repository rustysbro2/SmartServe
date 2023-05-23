const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { MessageEmbed } = require('discord.js');

class MusicPlayer {
    constructor(client, guildId) {
        this.client = client;
        this.guildId = guildId;
        this.queue = [];
        this.player = createAudioPlayer();
        this.connection = null;
        this.player.on('idle', () => {
            if(this.queue.length > 0) {
                this.play(this.queue.shift());
            }
        });
    }

    async join(channelId) {
        const channel = await this.client.channels.fetch(channelId);
        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: this.guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        this.connection.subscribe(this.player);
    }

    async play(url) {
        const stream = ytdl(url, { filter: 'audioonly' });
        const resource = createAudioResource(stream);
        this.player.play(resource);
    }

    enqueue(url) {
        this.queue.push(url);
    }

    async leaveIfEmpty() {
        if (!this.connection) return;

        const voiceChannel = this.client.channels.cache.get(this.connection.joinConfig.channelId);
        const channelMembers = voiceChannel.members;

        // Leave the voice channel if the bot is the only member left.
        if (channelMembers.size === 1) {
            this.connection.destroy();
            this.connection = null;
        }
    }
}

module.exports = MusicPlayer;