const { SlashCommandBuilder } = require('discord.js');
const { logStrike, buildStrikeLogEmbed } = require('../features/strikeFeature');
const pool = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Log a strike for a user')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to strike')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('The reason for the strike')
        .setRequired(true)
    ),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.options.getUser('user').id;
    const reason = interaction.options.get('reason').value;

    try {
      await logStrike(pool, guildId, userId, reason);
      await interaction.reply(`Strike logged for user <@${userId}>. Reason: ${reason}`);

      // Retrieve the strike channel from the database
      const getChannelQuery = `
        SELECT channel_id
        FROM strike_channels
        WHERE guild_id = ?
      `;
      const [channelRows] = await pool.query(getChannelQuery, [guildId]);
      const strikeChannel = channelRows[0]?.channel_id;

      // Send the strike log embed to the strike channel
      if (strikeChannel) {
        const strikeLogEmbed = await buildStrikeLogEmbed(guildId);
        const channel = await interaction.client.channels.fetch(strikeChannel);
        if (strikeLogEmbed && channel && channel.isText()) {
          await channel.send({ embeds: [strikeLogEmbed] });
        }
      }
    } catch (error) {
      console.error('Error logging strike:', error);
      await interaction.reply('An error occurred while logging the strike.');
    }
  },
};