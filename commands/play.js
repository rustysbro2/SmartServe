// commands/play.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const MusicPlayer = require('../features/musicPlayer.js');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('URL of the song to play')
                .setRequired(true)),
    async execute(interaction, client) {
        const url = interaction.options.getString('song');
        const guildId = interaction.guild.id;
        let musicPlayer = new MusicPlayer(guildId);
        if(!musicPlayer) {
            musicPlayer = new client.MusicPlayer(guildId);
            client.musicPlayers.set(guildId, musicPlayer);
        }
        await musicPlayer.join(interaction.member.voice.channel.id);
        musicPlayer.play(url);
        await interaction.reply('Playing your song!');
    },
};
