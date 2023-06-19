
const { SlashCommandBuilder } = require('discord.js');
const pool = require('../../../database.js'); // Adjust the import path based on the location of the 'database.js' file

async function createGuildsTable() {
  try {
    await pool.promise().query(`
      CREATE TABLE IF NOT EXISTS guilds (
        join_message_channel VARCHAR(255) NOT NULL,
        leave_message_channel VARCHAR(255) NOT NULL,
        target_guild_id VARCHAR(255) NOT NULL
      )
    `);
  } catch (error) {
    console.error('Error creating guilds table:', error);
    throw error;
  }
}

async function saveLeaveMessageChannelToDatabase(channelId, guildId) {
  try {
    const [rows] = await pool.promise().query('SELECT * FROM guilds WHERE target_guild_id = ? LIMIT 1', [guildId]);
    if (rows.length > 0) {
      await pool.promise().query('UPDATE guilds SET leave_message_channel = ? WHERE target_guild_id = ?', [channelId, guildId]);
    } else {
      await pool.promise().query('INSERT INTO guilds (leave_message_channel, target_guild_id) VALUES (?, ?)', [channelId, guildId]);
    }
  } catch (error) {
    console.error('Error saving leave message channel to the database:', error);
    throw error;
  }
}


module.exports = {
  data: new SlashCommandBuilder()
    .setName('setleave')
    .setDescription('Set the channel for the bot to send a leave message when removed from a guild')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send the leave message')
        .setRequired(true)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    console.log('Channel ID:', channel.id);
    console.log('Guild ID:', guildId);

    try {
      await createGuildsTable();

      await saveLeaveMessageChannelToDatabase(channel.id, guildId);

      const leaveMessage = `The bot has been removed from a guild!\nGuild ID: ${guildId}`;

      if (channel && channel.type === 'GUILD_TEXT') {
        console.log('Leave message channel:', channel.name);
        await channel.send(leaveMessage);
      } else {
        console.log('Channel not found or invalid channel type:', channel);
      }

      interaction.reply(`Leave message channel set to ${channel} for all guilds.`);
    } catch (error) {
      console.error('Error setting leave message channel:', error);
      interaction.reply('Failed to set the leave message channel. Please try again.');
    }
  },

  category: 'Administration',
  categoryDescription: 'Commands for server administration',
  global: false,
};
