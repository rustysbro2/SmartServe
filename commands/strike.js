// commands/strike.js

const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Strike a user')
    .addUserOption(option => option.setName('user').setDescription('Select a user').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Enter the reason for the strike').setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const guildId = interaction.guild.id;

    try {
      await db.query('INSERT INTO strikes (guild_id, user_id, reason) VALUES (?, ?, ?)', [guildId, user.id, reason]);
      await interaction.reply(`User ${user.tag} has been struck with reason: ${reason}`);
    } catch (error) {
      console.error('Error striking user:', error);
      await interaction.reply('Failed to strike the user.');
    }
  },
};
