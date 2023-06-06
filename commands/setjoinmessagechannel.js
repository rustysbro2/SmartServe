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
      await createGuildsTable();

      const guildId = interaction.guild.id;
      await saveJoinMessageChannelToDatabase(guildId, channel.id);

      const joinMessage = `The bot has been added to a new guild!\nGuild ID: ${guildId}`;

      if (channel && channel.type === 'GUILD_TEXT') {
        await channel.send(joinMessage);
      }

      interaction.reply(`Join message channel set to ${channel} for all new guilds.`);
    } catch (error) {
      console.error('Error setting join message channel:', error);
      interaction.reply('Failed to set the join message channel. Please try again.');
    }
  },

  category: 'Administration',
  categoryDescription: 'Commands for server administration',
  global: false,
};

async function createGuildsTable() {
  try {
    await pool.promise().query(`
      CREATE TABLE IF NOT EXISTS guilds (
        guild_id VARCHAR(255) COLLATE utf8mb4_general_ci,
        join_message_channel VARCHAR(255),
        PRIMARY KEY (guild_id)
      )
    `);
  } catch (error) {
    console.error('Error creating guilds table:', error);
    throw error;
  }
}

async function saveJoinMessageChannelToDatabase(guildId, channelId) {
  try {
    await pool.promise().query('INSERT INTO guilds (guild_id, join_message_channel) VALUES (?, ?) ON DUPLICATE KEY UPDATE join_message_channel = ?', [guildId, channelId, channelId]);
  } catch (error) {
    console.error('Error saving join message channel to the database:', error);
    throw error;
  }
}
