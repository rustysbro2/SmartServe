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
                if (this.queue.length > 0) {
                    this.play(this.queue.shift());
                }
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
        this.connection.subscribe(this.audioPlayer);
    }

    async play(url) {
        const stream = ytdl(url, { filter: 'audioonly' });
        const resource = createAudioResource(stream);
        this.audioPlayer.play(resource);
    }

    enqueue(url) {
        this.queue.push(url);
    }
}

module.exports = MusicPlayer;
