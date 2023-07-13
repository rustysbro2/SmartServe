const { pool } = require("../../database");
const { EmbedBuilder } = require("discord.js");
const { client } = require("../bot.js"); // Replace with the path to your Discord client file

async function strikePlayer(guildId, userId, reason) {
  try {
    const { affectedRows } = await pool.query(
      "INSERT INTO strikes (guildId, userId, reason) VALUES (?, ?, ?)",
      [guildId, userId, reason],
    );
    return affectedRows > 0;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function getStrikes(guildId) {
  try {
    const result = await pool.query(
      "SELECT userId, reason FROM strikes WHERE guildId = ?",
      [guildId],
    );
    console.log("Query result:", result);
    return result; // return all the strikes
  } catch (err) {
    console.log(err);
    return [];
  }
}

async function setStrikeChannel(guildId, channelId) {
  try {
    const { affectedRows } = await pool.query(
      "INSERT INTO strike_channels (guild_id, channel_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE channel_id = ?",
      [guildId, channelId, channelId],
    );
    return affectedRows > 0;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function getStrikeChannel(guildId) {
  try {
    const [row] = await pool.query(
      "SELECT channel_id FROM strike_channels WHERE guild_id = ? LIMIT 1",
      [guildId],
    );
    const channel = row ? row.channel_id : null;
    console.log("Strike channel ID:", channel);
    return channel;
  } catch (err) {
    console.log("Error executing query:", err);
    return null;
  }
}

async function getStrikeMessageId(guildId) {
  try {
    const [row] = await pool.query(
      "SELECT message_id FROM strike_messages WHERE guild_id = ? LIMIT 1",
      [guildId],
    );
    const messageId = row ? row.message_id : null;
    console.log("Strike message ID:", messageId);
    return messageId;
  } catch (err) {
    console.log("Error executing query:", err);
    return null;
  }
}

async function setStrikeMessageId(guildId, messageId) {
  try {
    const { affectedRows } = await pool.query(
      "INSERT INTO strike_messages (guild_id, message_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE message_id = ?",
      [guildId, messageId, messageId],
    );
    return affectedRows > 0;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function getStrikeEmbed(guildId, client) {
  console.log("getStrikeEmbed called with guildId:", guildId);
  const strikes = await getStrikes(guildId);
  console.log("Got strikes:", JSON.stringify(strikes));

  if (!strikes || !Array.isArray(strikes)) {
    console.log("No strikes found");
    return null;
  }

  let distinctReasons = [];
  let usersStrikes = {};
  for (let strike of strikes) {
    if (!distinctReasons.includes(strike.reason)) {
      distinctReasons.push(strike.reason);
    }
    if (!usersStrikes[strike.userId]) {
      usersStrikes[strike.userId] = [];
    }
    usersStrikes[strike.userId].push(strike.reason);
  }

  console.log("Distinct reasons:", distinctReasons);

  let fields = [];
  for (let userId in usersStrikes) {
    let userStrikes = usersStrikes[userId];
    let userStrikeReasons = [...new Set(userStrikes)];
    let userStrikeCount = userStrikes.length;

    // Mention the user by accessing the user from the cache
    const user = client?.users?.cache?.get(userId);

    const userMention = userId.startsWith("Unknown User")
      ? `Unknown User (${userId})`
      : `<@${userId.replace(/[@<>]/g, "")}>`;

    fields.push(
      { name: "User", value: userMention, inline: true },
      { name: "Strike Count", value: userStrikeCount.toString(), inline: true },
      {
        name: "Reasons",
        value: userStrikeReasons.join("\n") || "No reasons provided",
        inline: false,
      },
      { name: "\u200B", value: "\u200B" }, // Add blank fields as separators
    );
  }

  console.log("Adding fields to embed:", fields);

  const embed = new EmbedBuilder()
    .setTitle("Strikes")
    .setColor(0xff0000)
    .setDescription(`Distinct Reasons: ${distinctReasons.join(", ")}`)
    .addFields(fields);

  console.log("Returning embed");
  return embed;
}

async function getDistinctReasons(guildId) {
  try {
    const [result] = await pool.query(
      "SELECT DISTINCT reason FROM strikes WHERE guildId = ?",
      [guildId],
    );
    console.log("Query result:", result);
    const reasons = Array.isArray(result)
      ? result.map((row) => row.reason)
      : [result.reason];
    console.log("Distinct reasons:", reasons);
    return reasons;
  } catch (err) {
    console.log(err);
    return [];
  }
}

module.exports = {
  strikePlayer,
  getStrikes,
  setStrikeChannel,
  getStrikeChannel,
  getStrikeMessageId,
  setStrikeMessageId,
  getStrikeEmbed,
};
