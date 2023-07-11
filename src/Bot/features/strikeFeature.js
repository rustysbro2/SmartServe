const { pool } = require('../../database');
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

// Set debug mode to true to enable debug output
const debugMode = true;

async function handleStrike(interaction, client, targetUserId, reason) {
  try {
    const guildId = interaction.guildId;
    debugLog('[handleStrike] Handling strike for user:', targetUserId);
    debugLog('[handleStrike] Guild ID:', guildId);

    let strikeReasonId;
    // Check if the provided reason already exists or insert a new one
    if (reason) {
      strikeReasonId = await getStrikeReasonIdOrInsert(reason);
    } else {
      // Use the default reason and retrieve its ID
      const defaultReason = 'Inappropriate behavior';
      strikeReasonId = await getStrikeReasonIdOrInsert(defaultReason);
    }

    await addStrikeToDatabase(guildId, targetUserId, strikeReasonId);

    const strikeRows = await getAllStrikes(guildId);
    debugLog('[handleStrike] All Strikes:', strikeRows);

    const embed = createStrikeListEmbed();
    updateStrikeListEmbed(embed, strikeRows);

    // Retrieve the strike channel ID
    const channelId = await getStrikeChannelId(guildId);

    await sendStrikeEmbed(client, guildId, channelId, embed);

    debugLog('[handleStrike] Strike handled successfully');
  } catch (error) {
    console.error('[handleStrike] Error handling the strike:', error);
  }
}


async function addStrikeToDatabase(guildId, userId, strikeReasonId) {
  try {
    // Insert or update the strike record in the strikes table
    const insertOrUpdateStrikeQuery = `
      INSERT INTO strikes (guild_id, user_id, strike_count, strike_reason_id)
      VALUES (?, ?, 1, ?)
      ON DUPLICATE KEY UPDATE strike_count = strike_count + 1
    `;
    const insertOrUpdateStrikeValues = [guildId, userId, strikeReasonId];
    await pool.query(insertOrUpdateStrikeQuery, insertOrUpdateStrikeValues);
    debugLog('[addStrikeToDatabase] Strike record inserted or updated.');

    // Insert or update the strike reason in the user_strike_reasons table
    const insertOrUpdateUserStrikeReasonQuery = `
      INSERT INTO user_strike_reasons (guild_id, user_id, strike_reason_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE strike_reason_id = ?
    `;
    const insertOrUpdateUserStrikeReasonValues = [guildId, userId, strikeReasonId, strikeReasonId];
    await pool.query(insertOrUpdateUserStrikeReasonQuery, insertOrUpdateUserStrikeReasonValues);
    debugLog('[addStrikeToDatabase] User strike reason inserted or updated.');
  } catch (error) {
    console.error('[addStrikeToDatabase] Error inserting or updating strike and user_strike_reason:', error);
    throw error;
  }
}







async function getStrikeCount(guildId, userId) {
  const selectStrikeCountQuery = `
    SELECT strike_count
    FROM strikes
    WHERE guild_id = ? AND user_id = ?
  `;
  const selectStrikeCountValues = [guildId, userId];

  try {
    const result = await pool.query(selectStrikeCountQuery, selectStrikeCountValues);
    debugLog('[getStrikeCount] Result:', result);
    const rows = result[0];
    debugLog('[getStrikeCount] Rows:', rows);
    if (rows && rows.strike_count !== undefined) {
      return rows.strike_count;
    } else {
      return 0;
    }
  } catch (error) {
    console.error('[getStrikeCount] Error retrieving strike count:', error);
    throw error;
  }
}

async function getStrikeChannelId(guildId) {
  const selectChannelIdQuery = `
    SELECT channel_id
    FROM strike_channels
    WHERE guild_id = ?
  `;
  const selectChannelIdValues = [guildId];

  try {
    const result = await pool.query(selectChannelIdQuery, selectChannelIdValues);
    const rows = result[0];
    debugLog('[getStrikeChannelId] Rows:', rows);

    if (Array.isArray(rows) && rows.length > 0) {
      const channelIds = rows.map(row => row.channel_id);
      debugLog('[getStrikeChannelId] Channel IDs:', channelIds);
      return channelIds;
    } else if (typeof rows === 'object' && rows.channel_id !== undefined) {
      debugLog('[getStrikeChannelId] Channel ID:', rows.channel_id);
      return rows.channel_id;
    } else {
      console.error('[getStrikeChannelId] Invalid data returned for strike channel.');
      throw new Error('Invalid data returned for strike channel.');
    }
  } catch (error) {
    console.error('[getStrikeChannelId] Error retrieving strike channel IDs:', error);
    throw error;
  }
}

async function getAllStrikes(guildId) {
  const selectAllStrikesQuery = `
    SELECT strikes.user_id, strikes.strike_count, strike_reasons.reason AS strike_reason
    FROM strikes
    INNER JOIN user_strike_reasons ON strikes.user_id = user_strike_reasons.user_id
    INNER JOIN strike_reasons ON user_strike_reasons.strike_reason_id = strike_reasons.strike_id
    WHERE strikes.guild_id = ?
  `;
  const selectAllStrikesValues = [guildId];

  try {
    const result = await pool.query(selectAllStrikesQuery, selectAllStrikesValues);
    const rows = Array.isArray(result) ? result : [];
    debugLog('[getAllStrikes] Query Result:', result);
    debugLog('[getAllStrikes] Rows:', rows);
    return rows;
  } catch (error) {
    console.error('[getAllStrikes] Error retrieving strikes:', error);
    throw error;
  }
}

async function getStrikeReasonId(reason) {
  const selectStrikeReasonIdQuery = `
    SELECT strike_id
    FROM strike_reasons
    WHERE reason = ?
  `;
  const selectStrikeReasonIdValues = [reason];

  try {
    const [result] = await pool.query(selectStrikeReasonIdQuery, selectStrikeReasonIdValues);
    const rows = Array.isArray(result) ? result : [result];
    debugLog('[getStrikeReasonId] Rows:', rows);

    if (rows.length > 0 && rows[0].strike_id !== undefined) {
      debugLog('[getStrikeReasonId] Strike Reason ID:', rows[0].strike_id);
      return rows[0].strike_id;
    } else {
      // Reason not found, insert a new strike reason and retrieve the generated ID
      const insertedStrikeReasonId = await addStrikeReason(reason);
      return insertedStrikeReasonId;
    }
  } catch (error) {
    console.error('[getStrikeReasonId] Error retrieving or inserting strike reason:', error);
    throw error;
  }
}

async function getStrikeReasonIdOrInsert(reason) {
  const selectStrikeReasonIdQuery = `
    SELECT strike_id
    FROM strike_reasons
    WHERE reason = ?
  `;
  const selectStrikeReasonIdValues = [reason];

  try {
    const [result] = await pool.query(selectStrikeReasonIdQuery, selectStrikeReasonIdValues);
    const rows = Array.isArray(result) ? result : [result];
    debugLog('[getStrikeReasonId] Rows:', rows);

    if (rows.length > 0 && rows[0].strike_id !== undefined) {
      debugLog('[getStrikeReasonId] Strike Reason ID:', rows[0].strike_id);
      return rows[0].strike_id;
    } else {
      // Reason not found, insert a new strike reason and retrieve the generated ID
      const insertedStrikeReasonId = await addStrikeReason(reason);
      return insertedStrikeReasonId;
    }
  } catch (error) {
    console.error('[getStrikeReasonId] Error retrieving or inserting strike reason:', error);
    throw error;
  }
}

async function addStrikeReason(reason) {
  if (!reason) {
    throw new Error('Invalid strike reason provided.');
  }

  const insertStrikeReasonQuery = `
    INSERT INTO strike_reasons (reason)
    VALUES (?)
  `;
  const insertStrikeReasonValues = [reason];

  debugLog('Insert Strike Reason Query:', insertStrikeReasonQuery);
  debugLog('Insert Strike Reason Values:', insertStrikeReasonValues);

  try {
    const result = await pool.query(insertStrikeReasonQuery, insertStrikeReasonValues);
    debugLog('Result:', result);

    if (result && result.affectedRows === 1 && result.insertId !== undefined) {
      const insertedStrikeReasonId = result.insertId;
      debugLog('Strike reason inserted:', reason);
      return insertedStrikeReasonId;
    } else {
      console.error('Failed to retrieve the inserted strike reason ID.');
      throw new Error('Failed to retrieve the inserted strike reason ID.');
    }
  } catch (error) {
    console.error('Error inserting strike reason:', error);
    throw error;
  }
}





function createStrikeListEmbed() {
  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('Strike List');

  return embed;
}

function updateStrikeListEmbed(embed, strikeRows) {
  embed.fields = []; // Clear the fields array

  if (Array.isArray(strikeRows) && strikeRows.length > 0) {
    debugLog('[updateStrikeListEmbed] Processing array of strike rows:', strikeRows.length);
    const strikeMap = new Map(); // Map to store user strikes and reasons

    for (const row of strikeRows) {
      debugLog('[updateStrikeListEmbed] Adding strike for user:', row.user_id);

      if (strikeMap.has(row.user_id)) {
        // User already has strikes, append the current reason
        const existingStrike = strikeMap.get(row.user_id);
        strikeMap.set(row.user_id, `${existingStrike}\n${row.strike_reason}`);
      } else {
        // First strike for the user, set the reason
        strikeMap.set(row.user_id, row.strike_reason);
      }

      debugLog('[updateStrikeListEmbed] Added strike for user:', row.user_id);
    }

    // Iterate over the strike map and add fields to the embed
    for (const [userId, strikeReasons] of strikeMap) {
      embed.addFields(
        { name: 'User', value: `<@${userId}>`, inline: true },
        { name: 'Strike Count', value: strikeReasons.split('\n').length.toString(), inline: true },
        { name: 'Reason', value: strikeReasons || 'No reason provided', inline: false },
        { name: '\u200B', value: '\u200B' } // Add blank fields as separators
      );
    }

    embed.setDescription('Strikes Found');
  } else {
    debugLog('[updateStrikeListEmbed] No strikes found.');
    embed.setDescription('No strikes found.');
  }

  debugLog('[updateStrikeListEmbed] Updated Embed:', embed);
}

async function sendStrikeEmbed(client, guildId, channelId, embed) {
  const guild = client.guilds.cache.get(guildId);
  const strikeChannel = guild.channels.cache.get(channelId);

  debugLog('[sendStrikeEmbed] Strike Channel:', strikeChannel);
  debugLog('[sendStrikeEmbed] Channel Type:', strikeChannel?.type);

  try {
    if (strikeChannel) {
      const messages = await strikeChannel.messages.fetch();
      const embedMessage = messages.find(
        (msg) => msg.author.id === client.user.id && msg.embeds.length > 0 &&
          msg.embeds[0].title === 'Strike List' // Check if the embed title is 'Strike List'
      );

      if (embedMessage) {
        debugLog('[sendStrikeEmbed] Editing existing strike list embed:', embedMessage.id);
        await embedMessage.edit({ embeds: [embed] });
      } else {
        debugLog('[sendStrikeEmbed] Sending new embed message');
        await strikeChannel.send({ embeds: [embed] });
      }
    } else {
      console.error('[sendStrikeEmbed] Strike channel not found.');
      debugLog('[sendStrikeEmbed] Guild ID:', guildId);
      debugLog('[sendStrikeEmbed] Channel ID:', channelId);
      debugLog('[sendStrikeEmbed] Guild:', guild);
    }
  } catch (error) {
    console.error('[sendStrikeEmbed] Error sending strike embed:', error);
  }
}

function debugLog(...args) {
  if (debugMode) {
    console.log(...args);
  }
}

module.exports = {
  handleStrike,
  addStrikeReason,
};
