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
        console.log('Joining channel...');
        console.log('Channel ID:', this.channelId);
        console.log('Guild ID:', this.guildId);
        console.log('Text Channel:', this.textChannel.name);

        this.connection = joinVoiceChannel({
            channelId: this.channelId,
            guildId: this.guildId,
            adapterCreator: this.textChannel.guild.voiceAdapterCreator,
        });

        console.log('Connection:', this.connection);

        try {
            await Promise.race([
                entersState(this.connection, VoiceConnectionStatus.Ready, 30e3),
                entersState(this.connection, VoiceConnectionStatus.Signalling, 30e3),
            ]);
            console.log('Connection state:', this.connection.state.status);
        } catch (error) {
            this.connection.destroy();
            throw error;
        }

        this.connection.subscribe(this.audioPlayer);
        console.log('Joined voice channel successfully.');
    }


    async addSong(url) {
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

    sendNowPlaying() {
        this.textChannel.send(`Now playing: ${this.queue[0]}`);
    }
}

module.exports = MusicPlayer;
