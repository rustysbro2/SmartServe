const { Client, Collection, GatewayIntentBits, Presence, ActivityType } = require('discord.js');
const dotenv = require('dotenv');
const inviteTracker = require('./features/inviteTracker.js');
const fs = require('fs');
const helpCommand = require('./commands/General/help');
const path = require('path');
const setJoinMessageChannelCommand = require('./commands/Growth/setJoin.js');
const setLeaveMessageChannelCommand = require('./commands/Growth/setLeave.js');
const slashCommands = require('./slashCommands.js');
const pool = require('../database.js');
const { CHANNEL_TYPES } = require('discord.js');
const cron = require('node-cron');
dotenv.config(); // Load environment variables from .env file
const { startVoteReminderLoop, addPreviouslyVotedUsers } = require('./voteReminder');
const webhookServer = require('./Test');

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildPresences
];

const client = new Client({ shards: "auto", intents });

client.commands = new Collection();
client.musicPlayers = new Map();

const commandCategories = [];
const loadCommands = (dir, category = null) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.lstatSync(filePath);
    if (stat.isDirectory()) {
      loadCommands(filePath, file); // Recursively load commands from subdirectories
    } else if (file.endsWith('.js')) {
      const command = require(filePath);
      client.commands.set(command.data.name, command);

      // Handle category and command data
      const commandCategory = category ? category : 'Uncategorized';
      const commandData = {
        name: command.data.name,
        description: command.data.description,
        global: command.global !== false,
        categoryDescription: command.categoryDescription
      };

      // Find the category object or create a new one
      let categoryObj = commandCategories.find((c) => c.name === commandCategory);
      if (!categoryObj) {
        categoryObj = {
          name: commandCategory,
          description: '',
          commands: [],
          guildId: command.guildId,
          categoryDescription: command.categoryDescription
        };
        commandCategories.push(categoryObj);
      }

      // Add the command to the category
      categoryObj.commands.push(commandData);
    }
  }
};

const initializeCommands = () => {
  const commandsDir = path.join(__dirname, 'commands');
  loadCommands(commandsDir);
};

initializeCommands();

// Remove empty categories
commandCategories.forEach((category) => {
  if (category.commands.length === 0) {
    const index = commandCategories.indexOf(category);
    commandCategories.splice(index, 1);
  }
});

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
      status: "online",
    });

    inviteTracker.execute(client);
    // Call this function when your bot starts up

    await slashCommands(client);

    console.log('Command Categories:');
    commandCategories.forEach((category) => {
      console.log(`Category: ${category.name}`);
      console.log(`Guild ID: ${category.guildId}`);
      console.log('Commands:', category.commands);
    });
  } catch (error) {
    console.error('Error during bot initialization:', error);
  }

  try {
    // Start the vote reminder loop
    await startVoteReminderLoop(client);

    // Add previously voted users to the database
    await addPreviouslyVotedUsers(client);
    console.log('Previously voted users added to the database.');
  } catch (error) {
    console.error('Error during bot initialization:', error);
  }
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

    if (!channel || channel.type !== 0) {
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

    if (!channel || channel.type !== 0) {
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
webhookServer.start();

client.login(process.env.TOKEN);

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

module.exports = {
  client,
  saveJoinMessageChannelToDatabase,
  saveLeaveMessageChannelToDatabase
};
