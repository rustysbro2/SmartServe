const { setStrikeChannel } = require('../features/strikeFeature');
const pool = require('../database');

async function execute(interaction) {
  const guildId = interaction.guildId;
  const channelId = interaction.options.getChannel('channel').id;

  try {
    console.log(`Setting strike channel for guild: ${guildId}`);
    await setStrikeChannel(pool, guildId, channelId);
    console.log(`Strike channel set for guild: ${guildId}`);
    await interaction.reply(`Strike channel has been set successfully.`);
  } catch (error) {
    console.error('Error setting strike channel:', error);
    await interaction.reply('An error occurred while setting the strike channel.');
  }
}

module.exports = {
  data: {
    name: 'setstrikechannel',
    description: 'Set the channel for strike notifications',
    options: [
      {
        name: 'channel',
        description: 'The channel to set for strike notifications',
        type: 7, // Channel type: 7
        required: true,
      },
    ],
  },
  execute,
};
