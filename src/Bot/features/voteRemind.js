const path = require("path");
const mysql = require("mysql2/promise");
const axios = require("axios");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { connection } = require("../../database.js");

const botId = process.env.BOT_ID;
const topGGToken = process.env.TOPGG_TOKEN;
const supportServerLink = "https://discord.gg/wtzp28pHRK";
const topGGVoteLink = "https://top.gg/bot/1105598736551387247/vote";
const ownerUserId = "385324994533654530";
const webhookPort = 3006; // Replace with your desired webhook port

// Set debug to true to enable debug logs, false to disable
const debug = false;

/**
 * Function to send a message to a user via Direct Message (DM)
 * @param {User} user The user to send the message to
 * @param {string} message The message content
 */
async function sendMessage(user, message) {
  try {
    if (debug) {
      console.log(`Sending message to user: ${user.tag}`);
    }
    await user.send(message);
  } catch (error) {
    console.error(`Failed to send DM to ${user.tag}`);
  }
}

/**
 * Function to send a vote reminder to a user
 * @param {User} user The user to send the vote reminder to
 * @param {string} message The vote reminder message
 * @param {Client} client The Discord client instance
 */
async function sendVoteReminder(user, message, client) {
  const owner = await client.users.fetch(ownerUserId);
  message += ` The owner of the bot is ${owner}.`;
  if (debug) {
    console.log(`Sending vote reminder to user: ${user.tag}`);
  }
  sendMessage(user, message);
}

/**
 * Process each user's vote
 * @param {Object} userData The user's data object
 * @param {Client} client The Discord client instance
 */
async function processUser(userData, client) {
  if (debug) {
    console.log(`Processing user: ${userData.user_id}`);
  }
  const user = await client.users.fetch(userData.user_id);
  const [[userDatabaseData]] = await connection.query(
    "SELECT * FROM users WHERE user_id = ?",
    [userData.user_id],
  );

  if (
    userDatabaseData.voted === 0 &&
    Date.now() - new Date(userDatabaseData.recurring_remind_time).getTime() >=
      12 * 60 * 60 * 1000
  ) {
    const message = `Hello! It's been 12 hours since your last vote. Please consider voting for our bot again by visiting the vote link: ${topGGVoteLink}\n\nThe owner of the bot is <@${ownerUserId}>.\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;
    sendVoteReminder(user, message, client);
    await connection.query(
      "UPDATE users SET recurring_remind_time = ? WHERE user_id = ?",
      [new Date(), userData.user_id],
    );
  }
}

/**
 * Initiates recurring reminders for all users
 * @param {Client} client The Discord client instance
 */
async function sendRecurringReminders(client) {
  if (debug) {
    console.log("Initiating recurring reminders...");
  }
  const [users] = await connection.query(
    "SELECT user_id, voted, last_vote_time, recurring_remind_time, opt_out FROM users WHERE opt_out = 0",
  );
  const recurringReminderPromises = users.map((row) =>
    processUser(row, client),
  );
  await Promise.all(recurringReminderPromises);
}

/**
 * Fetches the vote status from the API for a member
 * @param {GuildMember} member The guild member
 * @returns {boolean} The vote status (true if voted, false if not voted)
 */
async function fetchVoteStatus(member) {
  const response = await axios.get(`https://top.gg/api/bots/${botId}/check`, {
    params: { userId: member.user.id },
    headers: { Authorization: topGGToken },
  });
  return response.data.voted;
}

/**
 * Fetches the existing user from the database
 * @param {GuildMember} member The guild member
 * @returns {Object|null} The existing user's data object if found, null otherwise
 */
async function fetchExistingUser(member) {
  const [[existingUser]] = await connection.query(
    "SELECT * FROM users WHERE user_id = ?",
    [member.user.id],
  );
  return existingUser;
}

/**
 * Updates the user's vote status in the database
 * @param {Object} existingUser The existing user's data object
 * @param {boolean} voteStatus The new vote status
 * @param {GuildMember} member The guild member
 * @param {Client} client The Discord client instance
 */
async function updateUserVoteStatus(existingUser, voteStatus, member, client) {
  const currentVoteStatus = existingUser.voted;
  if (voteStatus !== currentVoteStatus) {
    if (voteStatus === 0) {
      const message = `Hello! It seems you haven't voted yet. Please consider voting for our bot by visiting the vote link: ${topGGVoteLink}\n\nThe owner of the bot is <@${ownerUserId}>.\n\nJoin our support server for any assistance or questions: ${supportServerLink}`;
      sendVoteReminder(member.user, message, client);
      await connection.query(
        "UPDATE users SET recurring_remind_time = ? WHERE user_id = ?",
        [new Date(), member.user.id],
      );
    }
    await connection.query(
      "UPDATE users SET voted = ?, previous_vote_status = ? WHERE user_id = ?",
      [voteStatus, currentVoteStatus, member.user.id],
    );
  }
}

/**
 * Adds a new user to the database
 * @param {boolean} voteStatus The vote status of the new user
 * @param {GuildMember} member The guild member
 */
async function addNewUser(voteStatus, member) {
  await connection.query(
    "INSERT INTO users (user_id, voted, last_vote_time, previous_vote_status, recurring_remind_time, opt_out) VALUES (?, ?, ?, ?, ?, 1)",
    [member.user.id, voteStatus, new Date(), voteStatus, new Date()],
  );
  if (debug) {
    console.log(`User ${member.user.tag} has been added to the table.`);
  }
}

/**
 * Checks and records a user's vote
 * @param {GuildMember} member The guild member
 * @param {Client} client The Discord client instance
 */
async function checkAndRecordUserVote(member, client) {
  if (debug) {
    console.log(`Checking vote status for user: ${member.user.tag}`);
  }
  const voteStatus = await fetchVoteStatus(member);
  const existingUser = await fetchExistingUser(member);

  if (existingUser) {
    await updateUserVoteStatus(existingUser, voteStatus, member, client);
  } else {
    await addNewUser(voteStatus, member);
  }
}

/**
 * Handles the vote webhook request
 * @param {Request} req The webhook request object
 * @param {Response} res The webhook response object
 * @param {Client} client The Discord client instance
 */
async function handleVoteWebhook(req, res, client) {
  const user = req.body.user;
  if (!user) {
    console.error("Invalid vote webhook request. Missing user ID.");
    return res.sendStatus(400);
  }
  const guilds = client.guilds.cache.filter((guild) =>
    guild.members.cache.has(user),
  );
  if (guilds.size === 0) {
    console.error(`Member not found in any guild for user ID: ${user}`);
    return;
  }
  await processWebhookUser(guilds, user, res, client);
}

/**
 * Processes a user from the vote webhook
 * @param {Collection<string, Guild>} guilds The guild collection
 * @param {string} user The user ID
 * @param {Response} res The webhook response object
 * @param {Client} client The Discord client instance
 */
async function processWebhookUser(guilds, user, res, client) {
  for (const [, guild] of guilds) {
    const member = await guild.members.fetch(user);
    if (member) {
      await checkAndRecordUserVote(member, client);
      if (debug) {
        console.log(
          `Vote status checked and recorded for user: ${member.user.tag}`,
        );
      }
      break;
    }
  }
  res.sendStatus(200);
}

/**
 * Processes each guild member
 * @param {GuildMember} member The guild member
 * @param {Set<string>} checkedUsers Set of checked user IDs
 * @param {Client} client The Discord client instance
 */
async function processMember(member, checkedUsers, client) {
  const [[userData]] = await connection.query(
    "SELECT * FROM users WHERE user_id = ?",
    [member.user.id],
  );

  if (
    member.user.bot ||
    checkedUsers.has(member.user.id) ||
    (userData && userData.opt_out !== 0)
  ) {
    return; // Skip processing if the member is a bot, has already been processed, or has opted out
  }

  if (debug) {
    console.log(`Processing guild member: ${member.user.tag}`);
  }

  checkedUsers.add(member.user.id);

  if (!userData || (userData && userData.opt_out === 0)) {
    await checkAndRecordUserVote(member, client);
  }
}

/**
 * Processes each guild
 * @param {Guild} guild The guild
 * @param {Set<string>} checkedUsers Set of checked user IDs
 * @param {Client} client The Discord client instance
 */
async function processGuild(guild, checkedUsers, client) {
  if (debug) {
    console.log(`Processing guild: ${guild.name}`);
  }
  const members = await guild.members.fetch();
  for (const [, member] of members) {
    await processMember(member, checkedUsers, client);
  }
}

/**
 * Processes all guilds
 * @param {Client} client The Discord client instance
 * @param {Set<string>} checkedUsers Set of checked user IDs
 */
async function processAllGuilds(client, checkedUsers) {
  if (debug) {
    console.log("Processing all guilds...");
  }
  for (const [, guild] of client.guilds.cache) {
    await processGuild(guild, checkedUsers, client);
  }
}

/**
 * Checks the vote status for all guild members
 * @param {Client} client The Discord client instance
 */
async function checkAllGuildMembers(client) {
  if (debug) {
    console.log("Checking vote status for all guild members at startup...");
  }
  const checkedUsers = new Set();
  await processAllGuilds(client, checkedUsers);
  if (debug) {
    console.log("Sending recurring reminders at startup...");
  }
  sendRecurringReminders(client);
  setInterval(
    async () => {
      if (debug) {
        console.log(
          "Checking vote status for all guild members (every 5 minutes)...",
        );
      }
      checkedUsers.clear();
      await processAllGuilds(client, checkedUsers);
      if (debug) {
        console.log("Sending recurring reminders...");
      }
      sendRecurringReminders(client);
    },
    4 * 60 * 1000,
  );
}

module.exports = {
  checkAndRecordUserVote,
  checkAllGuildMembers,
  sendRecurringReminders,
  handleVoteWebhook,
};
