const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { pool } = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike-list')
    .setDescription('List all strikes for users in the guild'),

  async execute(interaction) {
    try {
      const guildId = interaction.guild.id;

      const result = await pool.query('SELECT user_id, strike_count FROM strikes WHERE guild_id = ?', [guildId]);
      let strikeRows = result[0];

      // If strikeRows is not an array, make it one
      if (!Array.isArray(strikeRows)) {
        strikeRows = [strikeRows];
      }

      if (strikeRows.length > 0) {
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('Strike List');

        for (const row of strikeRows) {
          embed.addFields(
            { name: 'User', value: `<@${row.user_id}>`, inline: true },
            { name: 'Strike Count', value: row.strike_count.toString(), inline: true } // Converted to string
          );
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        await interaction.reply('No strikes found in the guild.');
      }
    } catch (error) {
      console.error('Error retrieving strike list:', error);
      console.error('MySQL Error:', error.sqlMessage);
      await interaction.reply('An error occurred while retrieving the strike list.');
    }
  },
};
