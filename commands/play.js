const { SlashCommandBuilder } = require('@discordjs/builders');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube')
        .addStringOption(option => 
            option.setName('url')
                .setDescription('The YouTube URL of the song to play')
                .setRequired(true)),
    async execute(interaction, client) {
        const url = interaction.options.getString('url');
        const guildId = interaction.guildId;
        const userId = interaction.member.user.id;

        // The member who sent the command must be in a voice channel:
        const channel = interaction.member.voice.channel;
        if (!channel) {
            return await interaction.reply('You must be in a voice channel to play music!');
        }

        // Join the voice channel:
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        const audioPlayer = createAudioPlayer();
        connection.subscribe(audioPlayer);

        // We'll play the song using YouTube DL:
        const stream = ytdl(url, { filter: 'audioonly' });
        const resource = createAudioResource(stream);
        audioPlayer.play(resource);

        // Handle player status updates:
        audioPlayer.on('stateChange', (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                // If the player just turned idle, and wasn't previously idle, it means the song has finished playing
                audioPlayer.stop();
                connection.destroy();
            } else if (newState.status === AudioPlayerStatus.Playing) {
                // If the player just started playing, let's notify the user
                interaction.reply(`Now playing!`);
            }
        });

        // Handle voice connection status updates:
        connection.on('stateChange', (oldState, newState) => {
            if (newState.status === VoiceConnectionStatus.Disconnected) {
                if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
                    /*
                    If the WebSocket closed with a 4014 code, this means we should not manually attempt to reconnect,
                    but there is a chance the connection will recover itself if the reason of the disconnect was due to
                    switching voice channels. This is also the same code returned when the bot is kicked from the
                    guild, so we make sure to destroy the voice connection just in case.
                    */
                    connection.destroy();
                } else if (connection.rejoinAttempts < 5) {
                    /*
                    The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will
                    attempt to reconnect.
                    */
                    setTimeout(() => {
                        connection.rejoin();
                    }, (connection.rejoinAttempts + 1) * 5000);
                } else {
                    /*
                    The disconnect is not recoverable and we've exceeded the limit on rejoin attempts. We will destroy
                    the connection and advise the user that the connection has been permanently terminated.
                    */
                    connection.destroy();
                }
            } else if (newState.status === VoiceConnectionStatus.Destroyed) {
                // Once destroyed, stop the player
                audioPlayer.stop();
            }
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 20000);
        interaction.reply('Joining your voice channel...');
    },
};
