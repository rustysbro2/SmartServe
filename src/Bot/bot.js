require('dotenv').config(); // Load environment variables from .env file

const { Client, Collection, GatewayIntentBits, Presence, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const inviteTracker = require('./features/inviteTracker.js');
const helpCommand = require('./commands/help');
const setJoinMessageChannelCommand = require('./commands/Growth/setJoin.js');
const setLeaveMessageChannelCommand = require('./commands/Growth/setLeave.js');
const slashCommands = require('./slashCommands');
const optOutCommand = require('./commands/TopG/opt.js');
const pool = require('../database.js');
const { processUsers, addUserToDatabase, sendVoteReminder } = require('./gg.js');

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildPresences,
];

const client = new Client({ shards: 'auto', intents });

client.commands = new Collection();
client.musicPlayers = new Map();

const commandCategories = [];
const loadCommands = (dir, category = null) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.lstatSync(filePath);
    if (stat.isDirectory()) {
      loadCommands(filePath, file);
    } else if (file.endsWith('.js')) {
      const command = require(filePath);
      client.commands.set(command.data.name, command);

      const commandCategory = category || 'Uncategorized';
      const commandData = {
        name: command.data.name,
        description: command.data.description,
        global: command.global !== false,
        categoryDescription: command.categoryDescription,
      };

      let categoryObj = commandCategories.find((c) => c.name === commandCategory);
      if (!categoryObj) {
        categoryObj = {
          name: commandCategory,
          description: '',
          commands: [],
          guildId: command.guildId,
          categoryDescription: command.categoryDescription,
        };
        commandCategories.push(categoryObj);
      }

      categoryObj.commands.push(commandData);
    }
  }
};

const initializeCommands = () => {
  const commandsDir = path.join(__dirname, 'commands');
  loadCommands(commandsDir);
};

initializeCommands();

commandCategories.forEach((category) => {
  if (category.commands.length === 0) {
    const index = commandCategories.indexOf(category);
    commandCategories.splice(index, 1);
  }
});

async function getJoinMessageChannelFromDatabase(guildId) {
  try {
    const [rows] = await pool.promise().query('SELECT join_message_channel, target_guild_id FROM guilds WHERE target_guild_id = ? LIMIT 1', [guildId]);
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

client.once('ready', async () => {
  try {
    console.log(`Shard ${client.shard ? client.shard.ids : '0'} logged in as ${client.user.tag}!`);
    client.user.setPresence({
      activities: [
        {
          name: `${client.guilds.cache.size} servers | Shard ${client.shard ? client.shard.ids[0] : '0'}`,
          type: ActivityType.Watching,
        },
      ],
      status: 'online',
    });

    await client.guilds.fetch(); // Fetch guilds before processing users
    inviteTracker.execute(client);
    processUsers(client);

    await slashCommands(client);

    console.log('Command Categories:');
    commandCategories.forEach((category) => {
      console.log(`Category: ${category.name}`);
      console.log(`Guild ID: ${category.guildId}`);
      console.log('Commands:', category.commands);
    });

    // Schedule the vote reminders on startup
    await processUsers(client);

    // Schedule the vote reminders to run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      await processUsers(client);
    });
  } catch (error) {
    console.error('Error in client once event:', error);
  }
});

// Rest of your code...

client.login(process.env.TOKEN).catch((error) => {
  console.error('Error logging in:', error);
});

async function createGuildsTable() {
  try {
    await pool
      .promise()
      .query(`
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

module.exports = {
  client,
  saveJoinMessageChannelToDatabase,
  saveLeaveMessageChannelToDatabase,
};
