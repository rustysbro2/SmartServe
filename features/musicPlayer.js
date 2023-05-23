const { createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('discord-ytdl-core');
const fs = require('fs');
const path = require('path');
const util = require('util');
const stream = require('stream');
const pipeline = util.promisify(stream.pipeline);

class MusicPlayer {
    constructor(client, guildId) {
        this.client = client;
        this.guildId = guildId;
        this.queue = [];
        this.player = createAudioPlayer();
        this.connection = null;
        this.player.on(AudioPlayerStatus.Idle, () => {
            if(this.queue.length > 0) {
                this.playSong(this.queue.shift());
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
        this.queue.push(url);
        if (this.player.state.status === AudioPlayerStatus.Idle) {
            this.playSong(this.queue.shift());
        }
    }

async playSong(url) {
    try {
        const info = await ytdl.getBasicInfo(url);
        const formats = info.formats.filter((format) => format.audioBitrate);
        const bestFormat = formats.sort((a, b) => b.audioBitrate - a.audioBitrate)[0];

        const stream = ytdl(url, { format: bestFormat });
        const filename = path.join(__dirname, `${Date.now()}.opus`);
        await pipeline(stream, fs.createWriteStream(filename));

        const resource = createAudioResource(filename, { inputType: StreamType.OggOpus });
        this.player.play(resource);

        this.player.once(AudioPlayerStatus.Idle, () => {
            fs.unlink(filename, (err) => {
                if (err) {
                    console.error('Failed to delete file:', filename);
                }
            });
        });
    } catch (err) {
        console.error('Failed to play song:', err);
        // You might want to retry the operation, handle the error in some other way, or ignore it.
    }
}


    enqueue(url) {
        this.queue.push(url);
    }
}

module.exports = MusicPlayer;
