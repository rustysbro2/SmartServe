const { SlashCommandBuilder } = require('discord.js');
const {
  strikePlayer,
  getStrikes,
  getStrikeChannel,
  getStrikeEmbed,
  getStrikeMessageId,
  setStrikeMessageId,
} = require('../../features/strikeLogic');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Strike a user.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to strike.').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the strike.').setRequired(true)
    ),

  async execute(interaction) {
    const { guild } = interaction;
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason');

    try {
      const strikeResult = await strikePlayer(guild.id, target.id, reason);
      console.log(`Strike result: ${strikeResult}`);

      if (strikeResult) {
        await interaction.reply(`User <@${target.id}> has been striked for reason: ${reason}`);

        const strikeChannelId = await getStrikeChannel(guild.id);
        console.log(`Strike channel ID: ${strikeChannelId}`);

        await guild.channels.fetch();

        const strikeChannel = guild.channels.cache.get(strikeChannelId);
        console.log('Strike channel:', strikeChannel);

        if (strikeChannel && strikeChannel.type === 0) {
          const strikeEmbed = await getStrikeEmbed(guild.id);
          console.log('Strike embed:', strikeEmbed);

          const strikeMessageId = await getStrikeMessageId(guild.id);
          if (strikeMessageId) {
            const strikeMessage = await strikeChannel.messages.fetch(strikeMessageId);
            if (strikeMessage) {
              await strikeMessage.edit({ embeds: [strikeEmbed] });
            }
          } else {
            const sentMessage = await strikeChannel.send({ embeds: [strikeEmbed] });
            await setStrikeMessageId(guild.id, sentMessage.id);
          }
        } else {
          console.log(`No strike channel found for guild ${guild.id}`);
        }
      } else {
        interaction.followUp('Failed to strike user.');
      }
    } catch (error) {
      console.error('Error handling interaction:', error);
      interaction.followUp('An error occurred while processing the strike command.');
    }
  },
};
