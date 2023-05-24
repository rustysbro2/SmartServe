const { SlashCommandBuilder } = require('@discordjs/builders');
const { entersState, AudioPlayerStatus } = require('@discordjs/voice');
const { createAudioResource, joinVoiceChannel } = require('../musicUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('The YouTube URL of the song to play')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const url = interaction.options.getString('url');
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return await interaction.reply('You must be in a voice channel to use this command.');
      }

      const connection = joinVoiceChannel(voiceChannel);
      const resource = createAudioResource(url);

      connection.subscribe(resource.audioPlayer);

      await entersState(resource.audioPlayer, AudioPlayerStatus.Playing, 5000);

      await interaction.reply(`Now playing: ${url}`);
    } catch (error) {
      console.error('Error executing /play command:', error);
      await interaction.reply('There was an error while executing this command.');
    }
  },
};
