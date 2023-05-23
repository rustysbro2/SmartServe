// play.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { AudioPlayerStatus } = require('@discordjs/voice');
const MusicPlayer = require('../features/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song.')
        .addStringOption(option => option.setName('url').setDescription('The URL of the song to play').setRequired(true)),
    async execute(interaction, client) {
        const url = interaction.options.getString('url');
        const voiceChannel = interaction.member.voice.channelId;
        if (!voiceChannel) {
            return interaction.reply('You need to join a voice channel first!');
        }
        let musicPlayer = client.musicPlayers.get(voiceChannel);
        if (!musicPlayer) {
            musicPlayer = new MusicPlayer(client, voiceChannel);
            client.musicPlayers.set(voiceChannel, musicPlayer);
            await musicPlayer.join(voiceChannel);
        }
        musicPlayer.enqueue(url);
        if (musicPlayer.player.state.status === AudioPlayerStatus.Idle) {
            musicPlayer.play(musicPlayer.queue.shift());
        }
        await interaction.reply(`Queued your song! Queue size: ${musicPlayer.queue.length}`);
    },
};