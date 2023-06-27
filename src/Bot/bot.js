require('dotenv').config();
const express = require('express');
const { Client, Collection, GatewayIntentBits, Presence, ActivityType } = require('discord.js');
const token = process.env.TOKEN;
const inviteTracker = require('./features/inviteTracker.js');
const fs = require('fs');
const path = require('path');
const helpCommand = require('./commands/General/help');
const setJoinMessageChannelCommand = require('./commands/Growth/setJoin.js');
const setLeaveMessageChannelCommand = require('./commands/Growth/setLeave.js');
const slashCommands = require('./slashCommands.js');
const { pool } = require('../database.js');
const { checkAllGuildMembers, checkAndRecordUserVote, sendRecurringReminders, handleVoteWebhook } = require('./features/voteRemind');

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildPresences
];

const client = new Client({
  shardReadyTimeout: Number.MAX_SAFE_INTEGER,
  shards: "auto",
  intents
});

const app = express();
app.use(express.json());

app.post('/vote-webhook', (req, res) => {
  handleVoteWebhook(req, res, client);
});


client.commands = new Collection();
client.musicPlayers = new Map();

function walkDirectory(directory, callback) {
  fs.readdirSync(directory).forEach(file => {
    const absolute = path.join(directory, file);
    if (fs.statSync(absolute).isDirectory()) {
      walkDirectory(absolute, callback);
    } else {
      callback(absolute);
    }
  });
}

const commandCategories = [];

walkDirectory('./commands', (file) => {
  if (file.endsWith('.js')) {
    const command = require(`./${file}`);
    client.commands.set(command.data.name, command);

    if (command.category) {
      let category = commandCategories.find(category => category.name === command.category);
      if (!category) {
        category = {
          name: command.category,
          description: '',
          commands: [],
          guildId: command.guildId,
          categoryDescription: command.categoryDescription // Assign category description here
        };
        commandCategories.push(category);
      }
      category.commands.push({
        name: command.data.name,
        description: command.data.description,
        global: command.global !== false,
        categoryDescription: command.categoryDescription // Include the categoryDescription property
      });
    } else {
      let defaultCategory = commandCategories.find(category => category.name === 'Uncategorized');
      if (!defaultCategory) {
        defaultCategory = {
          name: 'Uncategorized',
          description: 'Commands that do not belong to any specific category',
          commands: [],
          guildId: undefined
        };
        commandCategories.push(defaultCategory);
      }
      defaultCategory.commands.push({
        name: command.data.name,
        description: command.data.description,
        global: command.global !== false
      });
    }
  }
});

// Remove empty categories
commandCategories.forEach((category) => {
  if (category.commands.length === 0) {
    const index = commandCategories.indexOf(category);
    commandCategories.splice(index, 1);
  }
});

client.once('ready', async () => {
  console.log(`Shard ${client.shard.ids} logged in as ${client.user.tag}!`);
  client.user.setPresence({
    activities: [
      {
        name: `${client.guilds.cache.size} servers | Shard ${client.shard.ids[0]}`,
        type: ActivityType.Watching,
      },
    ],
    status: "online",
  });

  inviteTracker.execute(client);
  await checkAllGuildMembers(client);
  await slashCommands(client);

  console.log('Command Categories:');
  commandCategories.forEach((category) => {
    console.log(`Category: ${category.name}`);
    console.log(`Guild ID: ${category.guildId}`);
    console.log('Commands:', category.commands);
  });

  const updatePresence = () => {
    client.user.setPresence({
      activities: [
        {
          name: `${client.guilds.cache.size} servers | Shard ${client.shard.ids[0]}`,
          type: ActivityType.Watching,
        },
      ],
      status: "online",
    });
  };

  updatePresence();
  setInterval(updatePresence, 60000);
});

app.listen(3006, () => {
  console.log('Vote webhook server listening on port 3005');
});

client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) {
    return;
  }

  await checkAndRecordUserVote(member);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'help_category') {
      helpCommand.handleSelectMenu(interaction, commandCategories);
    } else if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) {
        await command.execute(interaction, client, commandCategories);
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
  }
});

client.on('guildCreate', async (guild) => {
  try {
    console.log(`Bot joined a new guild: ${guild.name} (${guild.id})`);
    const members = await guild.members.fetch();
    members.forEach(async (member) => {
      if (member.user.bot) {
        return;
      }

      await checkAndRecordUserVote(member);
    });

    const joinMessageChannel = await getJoinMessageChannelFromDatabase(guild.id);

    if (!joinMessageChannel) {
      console.log('Join message channel not set in the database.');
      return;
    }

    console.log('Retrieved join message channel:', joinMessageChannel);

    const joinMessage = `The bot has been added to a new guild!\nGuild Name: ${guild.name}\nGuild ID: ${guild.id}`;

    const targetGuild = client.guilds.cache.get(joinMessageChannel.target_guild_id);
    if (!targetGuild) {
      console.log('Target guild not found.');
      return;
    }

    console.log('Target Guild:', targetGuild);

    console.log('Target Guild Channels:');
    targetGuild.channels.cache.forEach((channel) => {
      console.log(`Channel ID: ${channel.id}, Name: ${channel.name}, Type: ${channel.type}`);
    });

    const channel = targetGuild.channels.cache.get(joinMessageChannel.join_message_channel);
    console.log('Target Channel:', channel);
    console.log('Channel Type:', channel?.type);

    if (!channel || channel.type !== 'GUILD_TEXT') {
      console.log('Text channel not found in the target guild.');
      return;
    }

    await channel.send(joinMessage);
    console.log('Join message sent successfully.');
  } catch (error) {
    console.error('Error handling guildCreate event:', error);
  }
});

client.on('guildDelete', async (guild) => {
  try {
    console.log(`Bot left a guild: ${guild.name} (${guild.id})`);

    const leaveMessageChannel = await getLeaveMessageChannelFromDatabase();

    if (!leaveMessageChannel) {
      console.log('Leave message channel not set in the database.');
      return;
    }

    console.log('Retrieved leave message channel:', leaveMessageChannel);

    const leaveMessage = `The bot has been removed from a guild!\nGuild Name: ${guild.name}\nGuild ID: ${guild.id}`;

    const targetGuild = client.guilds.cache.get(leaveMessageChannel.target_guild_id);
    if (!targetGuild) {
      console.log('Target guild not found.');
      return;
    }

    console.log('Target Guild:', targetGuild);

    console.log('Target Guild Channels:');
    targetGuild.channels.cache.forEach((channel) => {
      console.log(`Channel ID: ${channel.id}, Name: ${channel.name}, Type: ${channel.type}`);
    });

    const channel = targetGuild.channels.cache.get(leaveMessageChannel.leave_message_channel);
    console.log('Target Channel:', channel);
    console.log('Channel Type:', channel?.type);

    if (!channel || channel.type !== 'GUILD_TEXT') {
      console.log('Text channel not found in the target guild.');
      return;
    }

    await channel.send(leaveMessage);
    console.log('Leave message sent successfully.');
  } catch (error) {
    console.error('Error handling guildDelete event:', error);
  }
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

async function getJoinMessageChannelFromDatabase(guildId) {
  try {
    const [rows] = await pool.promise().query('SELECT join_message_channel, target_guild_id FROM guilds WHERE target_guild_id = ?', [guildId]);
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

async function getLeaveMessageChannelFromDatabase() {
  try {
    const [rows] = await pool.promise().query('SELECT leave_message_channel, target_guild_id FROM guilds LIMIT 1');
    if (rows.length > 0) {
      const leaveMessageChannel = rows[0];
      console.log('Retrieved leave message channel:', leaveMessageChannel);
      return leaveMessageChannel;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving leave message channel from the database:', error);
    throw error;
  }
}

async function createGuildsTable() {
  try {
    await pool.promise().query(`
      CREATE TABLE IF NOT EXISTS guilds (
        join_message_channel VARCHAR(255) NOT NULL DEFAULT '',
        leave_message_channel VARCHAR(255) NOT NULL DEFAULT '',
        target_guild_id VARCHAR(255) NOT NULL,
        PRIMARY KEY (target_guild_id)
      )
    `);
  } catch (error) {
    console.error('Error creating guilds table:', error);
    throw error;
  }
}

async function saveJoinMessageChannelToDatabase(channelId, guildId) {
  try {
    await pool.promise().query('INSERT INTO guilds (join_message_channel, target_guild_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE join_message_channel = ?', [channelId, guildId, channelId]);
  } catch (error) {
    console.error('Error saving join message channel to the database:', error);
    throw error;
  }
}

async function saveLeaveMessageChannelToDatabase(channelId, guildId) {
  try {
    await pool.promise().query('INSERT INTO guilds (leave_message_channel, target_guild_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE leave_message_channel = ?', [channelId, guildId, channelId]);
  } catch (error) {
    console.error('Error saving leave message channel to the database:', error);
    throw error;
  }
}

createGuildsTable();
client.login(token);

const topGGToken = process.env.TOPGG_TOKEN;




module.exports = {
  client,
  saveJoinMessageChannelToDatabase,
  saveLeaveMessageChannelToDatabase,
	GatewayIntentBits
};