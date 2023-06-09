const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField } = require('@discordjs/builders');

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

const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField } = require('@discordjs/builders');

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

    // Bot Permissions
    const guild = interaction.guild;
    const botMember = await guild.members.fetch(interaction.client.user.id);
    const requiredBotPermissions = PermissionsBitField.Flags.EmbedLinks | PermissionsBitField.Flags.SendMessages | PermissionsBitField.Flags.ViewChannel  // Replace with the desired bot permissions

    if (!botMember.permissions.has(requiredBotPermissions)) {
      await interaction.reply("I need the 'Embed Links', 'Send Messages', and 'View Channel' permissions to use this command.");
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
