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

    try {
      await createGuildsTable();

      await saveJoinMessageChannelToDatabase(channel.id);

      const joinMessage = `The bot has been added to a new guild!\nGuild ID: ${guildId}`;

      if (channel && channel.type === 'GUILD_TEXT') {
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

module.exports.eventHandler = async (client, guild) => {
  try {
    console.log(`Bot joined a new guild: ${guild.name} (${guild.id})`);

    // Retrieve the join message channel for the support server from the database
    const joinMessageChannel = await getJoinMessageChannelFromDatabase();

    if (!joinMessageChannel) {
      console.log('Join message channel not set for the support server.');
      return;
    }

    const joinMessage = `The bot has been added to a new guild!\nGuild ID: ${guild.id}`;

    // Find the text channel in the support server by its ID
    const channel = guild.channels.cache.get(joinMessageChannel);

    if (channel && channel.isText()) {
      await channel.send(joinMessage);
      console.log('Join message sent successfully.');
    } else {
      console.log('Unable to send join message: Text channel not found in the support server.');
    }
  } catch (error) {
    console.error('Error handling guildCreate event:', error);
  }
};

async function createGuildsTable() {
  try {
    await pool.promise().query(`
      CREATE TABLE IF NOT EXISTS guilds (
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

async function getJoinMessageChannelFromDatabase() {
  try {
    const [rows] = await pool.promise().query('SELECT join_message_channel FROM guilds');
    if (rows.length > 0) {
      const joinMessageChannel = rows[0].join_message_channel;
      console.log('Retrieved join message channel:', joinMessageChannel);
      return joinMessageChannel;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving join message channel from the database:', error);
    throw error;
  }
}
