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
        this.setupListeners();
    }

    setupListeners() {
        this.audioPlayer.on('stateChange', (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                this.processQueue();
            } else if (newState.status === AudioPlayerStatus.Playing) {
                this.sendNowPlaying();
            }
        });

        this.audioPlayer.on('error', (error) => {
            this.textChannel.send(`Error: ${error.message}`);
        });
    }

    isValidYoutubeUrl(url) {
        const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}$/;
        return pattern.test(url);
    }



    async joinChannel() {
        const channel = await this.textChannel.guild.channels.fetch(this.channelId);
        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: this.guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        try {
            await entersState(this.connection, VoiceConnectionStatus.Ready, 30e3);
        } catch (error) {
            this.connection.destroy();
            throw error;
        }

        this.connection.subscribe(this.audioPlayer);
    }

    async addSong(url) {
        if (!this.isValidYoutubeUrl(url)) {
            throw new Error('Invalid YouTube URL');
        }

        const videoId = url.split('v=')[1];
        const newUrl = `https://www.youtube.com/watch?v=${videoId}`;
        this.queue.push(newUrl);

        if (this.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
            await this.processQueue();
        }
    }

    async processQueue() {
        if (!this.connection) {
            return;
        }

        if (this.queue.length === 0) {
            if (!this.connection.destroyed) {
                this.connection.destroy();
            }
            return;
        }

        const url = this.queue.shift();
        const stream = ytdl(url, { filter: 'audioonly' });
        const resource = createAudioResource(stream);
        this.audioPlayer.play(resource);
    }

    sendNowPlaying() {
        if (this.queue.length > 0) {
            this.textChannel.send(`Now playing: ${this.queue[0]}`);
        }
    }
}

module.exports = MusicPlayer;
