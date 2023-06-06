const { SlashCommandBuilder } = require('discord.js');
const pool = require('../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setjoinmessagechannel')
    .setDescription('Set the channel for the bot to send a join message when added to a new guild')
    .addChannelOption((option) =>
      option.setName('channel').setDescription('The channel to send the join message').setRequired(true)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');

    try {
      // Save the join message channel ID in the database
      await saveJoinMessageChannelToDatabase(channel.id);

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
    // Create the guilds table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS guilds (
        guild_id VARCHAR(255) COLLATE utf8mb4_general_ci PRIMARY KEY,
        join_message_channel VARCHAR(255)
      )
      DEFAULT CHARACTER SET utf8mb4
      COLLATE utf8mb4_general_ci
    `;
    await pool.promise().query(createTableQuery);

    // Update the join message channel for all guilds
    const updateQuery = `
      INSERT INTO guilds (guild_id, join_message_channel)
      SELECT guild_id, ?
      FROM guilds
      ON DUPLICATE KEY UPDATE join_message_channel = VALUES(join_message_channel)
    `;
    await pool.promise().query(updateQuery, [channelId]);
  } catch (error) {
    console.error('Error saving join message channel to the database:', error);
    throw error;
  }
}
