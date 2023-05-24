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
        console.log("Join method called"); // Add this line
        const channel = await this.client.channels.fetch(channelId);
        console.log("Channel fetched", channel); // Add this line
        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: this.guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        console.log("Join voice channel", this.connection); // Add this line
        this.connection.subscribe(this.player);
        console.log("Subscribed player"); // Add this line
    }

    async play(url) {
        console.log("Play method called", url); // Add this line
        const stream = ytdl(url, { filter: 'audioonly' });
        console.log("Stream created", stream); // Add this line
        const resource = createAudioResource(stream);
        console.log("Resource created", resource); // Add this line
        this.player.play(resource);
        console.log("Playback started"); // Add this line
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
