const { createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('discord-ytdl-core');
const prism = require('prism-media');

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
        const info = await ytdl.getBasicInfo(url);
        const formats = info.formats.filter((format) => format.audioBitrate);
        const bestFormat = ytdl.chooseFormat(formats, { quality: 'highestaudio' });
    
        const stream = new prism.OggOpusDemuxer().on('error', console.error);
        ytdl(url, { format: bestFormat }).pipe(stream);
    
        const resource = createAudioResource(stream, { inputType: StreamType.OggOpus });
        this.player.play(resource);
    }

    enqueue(url) {
        this.queue.push(url);
    }
}

module.exports = MusicPlayer;
