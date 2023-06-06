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

      await saveJoinMessageChannelToDatabase(channel.id);

      const joinMessage = 'The bot has been added to a new guild!';

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
        id INT PRIMARY KEY AUTO_INCREMENT,
        join_message_channel VARCHAR(255) NOT NULL
      )
    `);
  } catch (error) {
    console.error('Error creating guilds table:', error);
    throw error;
  }
}

async function saveJoinMessageChannelToDatabase(channelId) {
  try {
    await pool.promise().query('INSERT INTO guilds (join_message_channel) VALUES (?) ON DUPLICATE KEY UPDATE join_message_channel = ?', [channelId, channelId]);
  } catch (error) {
    console.error('Error saving join message channel to the database:', error);
    throw error;
  }
}
