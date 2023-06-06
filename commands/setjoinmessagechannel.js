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
    const guildId = interaction.guildId;

    try {
      // Create the guilds table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS guilds (
          guild_id VARCHAR(255),
          join_message_channel VARCHAR(255),
          PRIMARY KEY (guild_id)
        )
      `;
      await pool.promise().query(createTableQuery);

      // Save the join message channel ID in the database
      await saveJoinMessageChannelToDatabase(guildId, channel.id);

      const joinMessage = `The bot has been added to a new guild!\nGuild ID: ${guildId}`;

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

async function saveJoinMessageChannelToDatabase(guildId, channelId) {
  try {
    // Update the join message channel in the database
    await pool.promise().query('INSERT INTO guilds (guild_id, join_message_channel) VALUES (?, ?) ON DUPLICATE KEY UPDATE join_message_channel = ?', [guildId, channelId, channelId]);
  } catch (error) {
    console.error('Error saving join message channel to the database:', error);
    throw error;
  }
}
