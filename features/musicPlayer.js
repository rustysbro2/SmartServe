const { createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

class MusicPlayer {
    constructor(guildId) {
        this.guildId = guildId;
        this.queue = [];
        this.player = createAudioPlayer();
        this.connection = null;
        this.player.on(AudioPlayerStatus.Idle, () => {
            if(this.queue.length > 0) {
                this.play(this.queue.shift());
            }
        });
    }

    async join(channelId) {
        const channel = await client.channels.fetch(channelId);
        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: this.guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        this.connection.subscribe(this.player);
    }

    async play(url) {
        const stream = ytdl(url, { filter: 'audioonly' });
        const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
        this.player.play(resource);
    }

    enqueue(url) {
        this.queue.push(url);
    }
}

module.exports = MusicPlayer;
