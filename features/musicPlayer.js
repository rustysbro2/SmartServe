const { createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('discord-ytdl-core');

class MusicPlayer {
    constructor(client, guildId) {
        this.client = client;
        this.guildId = guildId;
        this.queue = [];
        this.player = createAudioPlayer();
        this.connection = null;

        // Adding error handling for the player
        this.player.on('error', error => {
            console.error(`Error in audio player: ${error.message}`);
        });

        // Monitoring the status of the AudioPlayer
        this.player.on('stateChange', (oldState, newState) => {
            console.log(`Audio player transitioned from ${oldState.status} to ${newState.status}`);
        });

        this.player.on(AudioPlayerStatus.Idle, () => {
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
        const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1<<25 });

        // Adding error handling for the stream
        stream.on('error', error => {
            console.error(`Error in audio stream: ${error.message}`);
        });

        const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
        this.player.play(resource);
    }

    enqueue(url) {
        this.queue.push(url);
    }
}

module.exports = MusicPlayer;
