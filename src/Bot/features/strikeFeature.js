const { pool } = require('../../database');
const { EmbedBuilder, Client, GatewayIntentBits } = require('discord.js');

async function handleStrike(interaction, client, targetUserId) {
  try {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;

    const strike = {
      guildId,
      userId: targetUserId,
      reason: 'Inappropriate behavior',
    };

    const selectQuery = `
      SELECT strike_count
      FROM strikes
      WHERE guild_id = ? AND user_id = ?
    `;
    const selectValues = [strike.guildId, strike.userId];

    let rows;
    try {
      const result = await pool.query(selectQuery, selectValues);
      rows = result[0];
    } catch (error) {
      console.error('Error with query:', error);
      return;
    }

    if (!rows || rows.length === 0) {
      const insertQuery = `
        INSERT INTO strikes (guild_id, user_id, strike_count)
        VALUES (?, ?, ?)
      `;
      const insertValues = [strike.guildId, strike.userId, 1];

      try {
        await pool.query(insertQuery, insertValues);
      } catch (error) {
        console.error('Error with insert query:', error);
        return;
      }
    } else {
      const updateQuery = `
        UPDATE strikes
        SET strike_count = strike_count + 1
        WHERE guild_id = ? AND user_id = ?
      `;
      const updateValues = [strike.guildId, strike.userId];

      try {
        await pool.query(updateQuery, updateValues);
      } catch (error) {
        console.error('Error with update query:', error);
        return;
      }
    }

    const selectAllStrikesQuery = `
      SELECT user_id, strike_count
      FROM strikes
      WHERE guild_id = ?
    `;
    const selectAllStrikesValues = [strike.guildId];

    let strikeRows;
    try {
      const result = await pool.query(selectAllStrikesQuery, selectAllStrikesValues);
      strikeRows = result[0];
    } catch (error) {
      console.error('Error retrieving strikes:', error);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('Strike List');

    if (Array.isArray(strikeRows) && strikeRows.length > 0) {
      for (const row of strikeRows) {
        embed.addFields(
          { name: `User <@${row.user_id}>`, value: `Strike Count: ${row.strike_count}`, inline: false },
        );
      }
    } else {
      embed.setDescription('No strikes found.');
    }

    // Fetch the strike channel using the Discord API
    const apiClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
    await apiClient.login(process.env.DISCORD_BOT_TOKEN);
    const guild = await apiClient.guilds.fetch(strike.guildId);

    console.log('Channels in the guild:');
    guild.channels.cache.each(channel => {
      console.log(`Channel ID: ${channel.id}`);
      console.log(`Channel Name: ${channel.name}`);
      console.log(`Channel Type: ${channel.type}`);
      console.log('---');
    });

    const strikeChannel = guild.channels.cache.get(channelId);

    console.log('Strike Channel:', strikeChannel); // Add this line for debugging

    if (strikeChannel) {
      await strikeChannel.send({ embeds: [embed] });
      console.log('Strike handled successfully');
    } else {
      console.error('Strike channel not found.');
      console.log('Guild ID:', strike.guildId);
      console.log('Channel ID:', channelId);
      console.log('Guild:', guild);
    }
  } catch (error) {
    console.error('Error handling the strike:', error);
  }
}

module.exports = {
  handleStrike,
};
