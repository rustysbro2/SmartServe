const { SlashCommandBuilder, channelMention } = require('discord.js');
const pool = require('../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setjoinmessagechannel')
    .setDescription('Set the channel for the bot to send a join message when added to a new guild')
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
    if (interaction.options.getSubcommand() === 'join') {
      const channel = interaction.options.getChannel('channel');
      const guildId = interaction.guild.id;

      console.log('Join Channel ID:', channel.id);
      console.log('Guild ID:', guildId);

      try {
        await createGuildsTable();

        await saveJoinMessageChannelToDatabase(channel.id, guildId);

        const joinMessage = `The bot has been added to a new guild!\nGuild: ${interaction.guild.name} (${guildId})`;

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
    } else if (interaction.options.getSubcommand() === 'leave') {
      const channel = interaction.options.getChannel('channel');
      const guildId = interaction.guild.id;

      console.log('Leave Channel ID:', channel.id);
      console.log('Guild ID:', guildId);

      try {
        await createGuildsTable();

        await saveLeaveMessageChannelToDatabase(channel.id, guildId);

        const leaveMessage = `The bot has left a guild!\nGuild: ${interaction.guild.name} (${guildId})`;

        if (channel && channel.type === 'GUILD_TEXT') {
          console.log('Leave message channel:', channel.name);
          await channel.send(leaveMessage);
        } else {
          console.log('Channel not found or invalid channel type:', channel);
        }

        interaction.reply(`Leave message channel set to ${channel} for all new guilds.`);
      } catch (error) {
        console.error('Error setting leave message channel:', error);
        interaction.reply('Failed to set the leave message channel. Please try again.');
      }
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
    console.error('Error creating guilds table:',
