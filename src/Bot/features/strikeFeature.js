const { pool } = require('../../database');
const { EmbedBuilder } = require('discord.js');

async function handleStrike(interaction, client, targetUserId) {
  try {
    const guildId = interaction.guildId;

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

    // Fetch the strike channel
    const selectChannelQuery = `
      SELECT guild_id, channel_id
      FROM strike_channels
      WHERE guild_id = ?
    `;
    const selectChannelValues = [strike.guildId];

    let channelRows;
    try {
      const result = await pool.query(selectChannelQuery, selectChannelValues);
      channelRows = result[0];
    } catch (error) {
      console.error('Error with strike channel query:', error);
      return;
    }

    console.log('Strike channel query result:', channelRows);

    if (channelRows && channelRows.length > 0) {
      const strikeChannelId = channelRows[0].channel_id;

      const guild = client.guilds.cache.get(strike.guildId);
      if (!guild) {
        console.error('Guild not found. ID:', strike.guildId);
        return;
      }

      const strikeChannel = guild.channels.resolve(strikeChannelId);
      if (!strikeChannel) {
        console.error('Strike channel not found. ID:', strikeChannelId);
        console.log('Guild channels:');
        guild.channels.cache.forEach((channel) => {
          console.log(channel.id, channel.name, channel.type);
        });
        return;
      }

      // Fetch all strikes
      const selectAllStrikesQuery = `
        SELECT user_id, strike_count
        FROM strikes
        WHERE guild_id = ?
      `;
      const selectAllStrikesValues = [strike.guildId];

      const [allStrikesRows] = await pool.query(selectAllStrikesQuery, selectAllStrikesValues);

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Strike List');

      for (const row of allStrikesRows) {
        embed.addFields(
          { name: `User <@${row.user_id}>`, value: `Strike Count: ${row.strike_count}`, inline: false },
        );
      }

      // Send or update the message in the strike channel
      const messages = await strikeChannel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();

      if (lastMessage && lastMessage.author.bot) {
        // If the last message was sent by the bot, edit it
        await lastMessage.edit({ embeds: [embed] });
      } else {
        // Otherwise, send a new message
        await strikeChannel.send({ embeds: [embed] });
      }
    } else {
      console.error('Strike channel ID not found');
      const guild = client.guilds.cache.get(strike.guildId);
      if (!guild) {
        console.error('Guild not found. ID:', strike.guildId);
        return;
      }
      console.log('Guild channels:');
      guild.channels.cache.forEach((channel) => {
        console.log(channel.id, channel.name, channel.type);
      });
      return;
    }

    console.log('Strike handled successfully');
  } catch (error) {
    console.error('Error handling the strike:', error);
  }
}

module.exports = {
  handleStrike,
};
