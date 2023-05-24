const { SlashCommandBuilder } = require('@discordjs/builders');
const MusicPlayer = require('../features/musicPlayer.js');

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
        const channelId = interaction.member.voice.channelId;
        const textChannel = interaction.channel;

        // Create or retrieve the music player for this guild
        let musicPlayer = client.musicPlayers.get(guildId);
        if (!musicPlayer) {
            musicPlayer = new MusicPlayer(guildId, channelId, textChannel);
            client.musicPlayers.set(guildId, musicPlayer);
            await musicPlayer.join(channelId);
        }

        try {
            await musicPlayer.addSong(url);
            await interaction.reply('Added to queue!');
        } catch (error) {
            await interaction.reply(`Error: ${error.message}`);
        }
    },
};
