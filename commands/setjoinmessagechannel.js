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
    const guildId = interaction.guild.id;

    console.log('Channel ID:', channel.id);
    console.log('Guild ID:', guildId);

    try {
      await createGuildsTable();

      await saveJoinMessageChannelToDatabase(channel.id, guildId);

      const joinMessage = `The bot has been added to a new guild!\nGuild ID: ${guildId}`;

      if (channel && channel.type === 'GUILD_TEXT') {
        console.log('Join message channel:', channel.name);
        await channel.send(joinMessage);
      } else {
        console.log('Channel not found or invalid channel type:', channel);
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
        join_message_channel VARCHAR(255) NOT NULL,
        target_guild_id VARCHAR(255) NOT NULL
      )
    `);
  } catch (error) {
    console.error('Error creating guilds table:', error);
    throw error;
  }
}

async function saveJoinMessageChannelToDatabase(channelId, guildId) {
  try {
    await pool.promise().query('INSERT INTO guilds (join_message_channel, target_guild_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE join_message_channel = ?, target_guild_id = ?', [channelId, guildId, channelId, guildId]);
  } catch (error) {
    console.error('Error saving join message channel to the database:', error);
    throw error;
  }
}
