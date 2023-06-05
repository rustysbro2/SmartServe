// commands/strike.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const { logStrike, getStrikeChannel } = require('../features/strikeFeature.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Log a strike for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to strike')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('The reason for the strike')
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const guildId = interaction.guildId;

    if (!user || !reason) {
      return interaction.reply('Invalid command usage. Please provide a valid user and reason.');
    }

    const strikeChannelId = getStrikeChannel(guildId);

    if (!strikeChannelId) {
      return interaction.reply('Strike channel has not been set. Please set the strike channel first.');
    }

    await logStrike(guildId, user.id, reason, client);

    const strikeChannel = await interaction.guild.channels.fetch(strikeChannelId);
    if (strikeChannel) {
      strikeChannel.send(`User <@${user.id}> has received a strike: ${reason}`);
      console.log(`Strike logged in guild ${guildId} and sent to strike channel ${strikeChannelId}`);
    }

    interaction.reply(`Strike logged for user <@${user.id}>: ${reason}`);
  },
};
