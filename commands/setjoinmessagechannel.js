const { SlashCommandBuilder, channelMention } = require('discord.js');
const pool = require('../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setjoinmessagechannel')
    .setDescription('Set the channel for the bot to send a join or leave message when added to or removed from a guild')
    .addSubcommand(subcommand =>
      subcommand
        .setName('join')
        .setDescription('Set the join message channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to send the join message')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leave')
        .setDescription('Set the leave message channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to send the leave message')
            .setRequired(true))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    console.log(`${subcommand.charAt(0).toUpperCase() + subcommand.slice(1)} Channel ID:`, channel.id);
    console.log('Guild ID:', guildId);

    try {
      await createGuildsTable();

      if (subcommand === 'join') {
        await saveJoinMessageChannelToDatabase(channel.id, guildId);

        const joinMessage = `The bot has been added to a new guild!\nGuild: ${interaction.guild.name} (${guildId})`;

        if (channel && channel.type === 'GUILD_TEXT') {
          console.log('Join message channel:', channel.name);
          await channel.send(joinMessage);
        } else {
          console.log('Channel not found or invalid channel type:', channel);
        }

        interaction.reply(`Join message channel set to ${channel} for all new guilds.`);
      } else if (subcommand === 'leave') {
        await saveLeaveMessageChannelToDatabase(channel.id, guildId);

        const leaveMessage = `The bot has left a guild!\nGuild: ${interaction.guild.name} (${guildId})`;

        if (channel && channel.type === 'GUILD_TEXT') {
          console.log('Leave message channel:', channel.name);
          await channel.send(leaveMessage);
        } else {
          console.log('Channel not found or invalid channel type:', channel);
        }

        interaction.reply(`Leave message channel set to ${channel} for all new guilds.`);
      }
    } catch (error) {
      console.error(`Error setting ${subcommand} message channel:`, error);
      interaction.reply(`Failed to set the ${subcommand} message channel. Please try again.`);
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
        leave_message_channel VARCHAR(255) NOT NULL,
        target_guild_id VARCHAR(255) NOT NULL
      )
    `);
  } catch (error) {
    console.error('Error creating guilds table:', error);
    throw error;
  }
}

async function getJoinMessageChannelFromDatabase(guildId) {
  try {
    const [rows] = await pool.promise().query('SELECT join_message_channel, target_guild_id FROM guilds WHERE target_guild_id = ?', [guildId]);
    console.log('Rows:', rows);
    if (rows.length > 0) {
      const joinMessageChannel = rows[0];
      console.log('Retrieved join message channel:', joinMessageChannel);
      return joinMessageChannel;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving join message channel from the database:', error);
    throw error;
  }
}


async function saveLeaveMessageChannelToDatabase(channelId, guildId) {
  try {
    await pool.promise().query('UPDATE guilds SET leave_message_channel = ? WHERE target_guild_id = ?', [channelId, guildId]);
  } catch (error) {
    console.error('Error saving leave message channel to the database:', error);
    throw error;
  }
}



