const { setStrikeChannel } = require('../strikeFeature');
const pool = require('../database');

async function execute(interaction, pool) {
  const guildId = interaction.guildId;
  const channelId = interaction.options.getChannel('channel').id;

  try {
    await setStrikeChannel(pool, guildId, channelId);
    await interaction.reply('Strike channel has been set successfully.');
  } catch (error) {
    console.error('Error setting strike channel:', error);
    await interaction.reply('An error occurred while setting the strike channel.');
  }
}

module.exports = {
  data: {
    name: 'setstrikechannel',
    description: 'Set the channel where strikes will be logged',
    options: [
      {
        name: 'channel',
        description: 'The channel to set as the strike channel',
        type: 'CHANNEL',
        required: true,
      },
    ],
  },
  execute,
};
