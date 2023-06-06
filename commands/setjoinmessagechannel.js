const { SlashCommandBuilder } = require('discord.js');
const pool = require('../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setjoinmessagechannel')
    .setDescription('Set the channel for the bot to send a join message when added to a new guild')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send the join message')
        .setRequired(true)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');

    try {
      // Save the join message channel ID in the database
      await saveJoinMessageChannelToDatabase(channel.id);

      const joinMessage = `The bot has been added to a new guild!\nGuild ID: ${interaction.guildId}`;

      // Send the join message in the specified channel
      if (channel && channel.isText()) {
        await channel.send(joinMessage);
      }

      interaction.reply(`Join message channel set to ${channel} for this guild.`);
    } catch (error) {
      console.error('Error setting join message channel:', error);
      interaction.reply('Failed to set the join message channel. Please try again.');
    }
  },

  category: 'Administration',
  categoryDescription: 'Commands for server administration',
  global: false,
};

async function saveJoinMessageChannelToDatabase(channelId) {
  try {
    // Update the join message channel in the database
    await pool.promise().query('UPDATE guilds SET join_message_channel = ? WHERE id = 1', [channelId]);
  } catch (error) {
    console.error('Error saving join message channel to the database:', error);
    throw error;
  }
}
