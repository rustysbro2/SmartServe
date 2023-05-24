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
        let musicPlayer = client.musicPlayers.get(interaction.guildId);
        if (!musicPlayer) {
            musicPlayer = new MusicPlayer(client, interaction.guildId);
            client.musicPlayers.set(interaction.guildId, musicPlayer);
        }
        if (!musicPlayer.connection) {
            const channel = interaction.member.voice.channelId;
            if (!channel) {
                return interaction.reply('You need to join a voice channel first!');
            }
            await musicPlayer.join(channel);
        }
        musicPlayer.enqueue(url);
        if (musicPlayer.player.state.status === AudioPlayerStatus.Idle) {
            await interaction.channel.send(`Now playing: ${url}`);
            musicPlayer.play(musicPlayer.queue.shift());
        }
        await interaction.reply(`Queued your song! The queue now has ${musicPlayer.queue.length} song(s).`);
    },
};
