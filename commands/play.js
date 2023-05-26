const { SlashCommandBuilder } = require('discord.js');
const MusicPlayer = require('../features/musicPlayer.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption(option =>
      option
        .setName('url')
        .setDescription('The YouTube URL of the song to play')
        .setRequired(true)),
  async execute(interaction, client) {
    try {
      console.log('Executing /play command...');
      const url = interaction.options.getString('url');
      console.log('URL:', url);
      const guildId = interaction.guildId;
      console.log('Guild ID:', guildId);
      const channelId = interaction.member.voice.channelId;
      console.log('Channel ID:', channelId);
      const textChannel = interaction.channel;

      if (!channelId) {
        console.log('User not in a voice channel.');
        return await interaction.reply('You must be in a voice channel to play music!');
      }

      // Respond to the interaction right away to avoid a timeout
      await interaction.reply('Processing your request...');

      let musicPlayer = client.musicPlayers.get(guildId);
      if (!musicPlayer) {
        console.log('Creating new MusicPlayer instance.');
        musicPlayer = new MusicPlayer(guildId, channelId, textChannel);
        client.musicPlayers.set(guildId, musicPlayer);
        await musicPlayer.joinChannel();
      }

      const wasEmpty = musicPlayer.queue.length === 0;
      console.log('Queue was empty before adding song:', wasEmpty);

      await musicPlayer.addSong(url, interaction.member.user.tag);

      if (wasEmpty && musicPlayer.queue.length === 1) {
        musicPlayer.playNext();
      }
    } catch (error) {
      console.error(`Error executing /play command: ${error.message}`);
      await interaction.editReply({ content: `There was an error while executing this command! Error details: ${error.message}`, ephemeral: true });
    }
  },
};
