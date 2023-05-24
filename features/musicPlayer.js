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
    constructor(client, guildId, channelId, textChannel) {
        this.client = client;
        this.guildId = guildId;
        this.channelId = channelId;
        this.textChannel = textChannel;
        this.queue = [];
        this.audioPlayer = createAudioPlayer();
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

    async joinChannel() {
        const channel = await this.client.channels.fetch(this.channelId);
        if (!channel || channel.type !== 'GUILD_VOICE') {
            throw new Error('Invalid voice channel');
        }

        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: this.guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        try {
            await entersState(this.connection, VoiceConnectionStatus.Ready, 20e3);
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

        this.queue.push(url);
        if (this.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
            await this.processQueue();
        }
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.connection.destroy();
            return;
        }

        const url = this.queue.shift();
        const stream = ytdl(url, { filter: 'audioonly' });
        const resource = createAudioResource(stream);
        this.audioPlayer.play(resource);
    }

    isValidYoutubeUrl(url) {
        const pattern = /^((http(s)?:\/\/)?((w){3}.)?youtube(.com)?|.*)((\?v=)|v\/|embed\/|watch\?|\&v=)?(\?v=)?([^#&?]*).*/;
        return pattern.test(url);
    }

    sendNowPlaying() {
        this.textChannel.send(`Now playing: ${this.queue[0]}`);
    }
}

module.exports = MusicPlayer;
