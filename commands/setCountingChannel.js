const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../database.js');
const { Collection } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setcountingchannel')
    .setDescription('Set the counting channel for the counting game')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to use for counting').setRequired(true)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    if (!channel) return;

    const guildId = interaction.guildId;
    const channelId = channel.id;

    // Save the counting channel in the database
    db.query(
      `
      INSERT INTO countingChannels (guildId, channelId)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
      channelId = VALUES(channelId)
      `,
      [guildId, channelId],
      function (error) {
        if (error) console.error(`Failed to set counting channel for guild ${guildId}:`, error);
      }
    );

    // Update the counting channel collection
    const countingChannels = new Collection();
    countingChannels.set(guildId, channelId);

    await interaction.reply(`Counting channel set to ${channel}`);
  },
};
