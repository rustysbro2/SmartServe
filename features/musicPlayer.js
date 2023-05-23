const { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { MessageEmbed } = require('discord.js');

class MusicPlayer {
    constructor(client, guildId) {
        this.client = client;
        this.guildId = guildId;
        this.queue = [];
        this.player = createAudioPlayer();
        this.connection = null;
        this.player.on(AudioPlayerStatus.Idle, () => {
            if(this.queue.length > 0) {
                this.play(this.queue.shift());
            } else {
                this.connection.destroy();
                this.connection = null;
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

        // Listen to the connection's "state change" event
        this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    this.connection.rejoin(),
                    new Promise(resolve => setTimeout(resolve, 5_000))
                ]);
            } catch (error) {
                this.client.console.warn('Failed to reconnect: closing connection');
                this.connection.destroy();
            }
        });
    }

    async play(url) {
        try {
            const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
            const resource = createAudioResource(stream);
            this.player.play(resource);
        } catch (error) {
            console.error(`Failed to play song: ${error}`);
            // You might want to remove the song from the queue
        }
    }

    enqueue(url) {
        this.queue.push(url);
    }
}

module.exports = MusicPlayer;