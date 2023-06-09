const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voteskip')
    .setDescription('Vote to skip the current song'),

  async execute(interaction, client) {
    const guildId = interaction.guild.id;
    const channelId = interaction.member.voice.channelId;
    const musicPlayer = client.musicPlayers.get(guildId);

    if (!musicPlayer || musicPlayer.channelId !== channelId) {
      await interaction.reply('You are not in the same voice channel as the bot.');
      return;
    }

    // Check if the bot has the "Send Messages" permission in the current channel
    const botMember = interaction.guild.me;
    const botChannelPermissions = interaction.channel.permissionsFor(botMember);
    if (!botChannelPermissions.has('SEND_MESSAGES')) {
      await interaction.reply('The bot does not have permission to send messages in this channel.');
      return;
    }

    try {
      const voteCount = await musicPlayer.voteSkip(interaction.member);
      const requiredVotes = Math.ceil((musicPlayer.voiceChannelMemberCount - 1) / 2); // Exclude the bot

      if (voteCount >= requiredVotes) {
        await musicPlayer.skip();
        await interaction.reply('The current song has been skipped.');
      } else {
        await interaction.reply('Your vote to skip the current song has been counted.');
      }
    } catch (error) {
      console.error(error);
      await interaction.reply(`Failed to vote skip: ${error.message}`);
    }
  },

  category: 'Music',
  categoryDescription: 'Commands related to music functionality',
};
