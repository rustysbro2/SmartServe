const { Client, Collection, GatewayIntentBits, Presence, ActivityType } = require('discord.js');
const { token } = require('./config.js');
const inviteTracker = require('./features/inviteTracker.js');
const fs = require('fs');
const helpCommand = require('./commands/help');
const countingCommand = require('./commands/count');
const setJoinMessageChannelCommand = require('./commands/setjoinmessagechannel.js');
const setLeaveMessageChannelCommand = require('./commands/setleavemessagechannel.js');
const slashCommands = require('./slashCommands.js');
const pool = require('./database.js');
const { CHANNEL_TYPES } = require('discord.js');

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

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commandCategories = [];

for (const file of commandFiles) {
  const command = require(`./commands/${file.endsWith('.js') ? file : file + '.js'}`);
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

// Remove empty categories
commandCategories.forEach((category) => {
  if (category.commands.length === 0) {
    const index = commandCategories.indexOf(category);
    commandCategories.splice(index, 1);
  }
});

client.once('ready', async () => {
  try {
    console.log(`Shard ${client.shard.ids} logged in as ${client.user.tag}!`);

    await inviteTracker.execute(client);
    await slashCommands(client);

    console.log('Command Categories:');
    commandCategories.forEach((category) => {
      console.log(`Category: ${category.name}`);
      console.log(`Guild ID: ${category.guildId}`);
      console.log('Commands:', category.commands);
    });

    updatePresence(); // Initial presence update
    setInterval(updatePresence, 60000); // Update presence every 1 minute
  } catch (error) {
    console.error('Error during bot initialization:', error);
  }
});




async function updatePresence() {
  try {
    await client.guilds.fetch(); // Fetches the latest guild information
    const serverCount = client.guilds.cache.size;

    client.user.setActivity(`${serverCount} servers | Shard ${client.shard.ids[0]}`, {
      type: 'WATCHING'
    });
  } catch (error) {
    console.error('Failed to update presence:', error);
  }
}





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

    const joinMessage = `The bot has been added to a new guild!\nGuild ID: ${guild.id}`;

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

    if (!channel || channel.type !== CHANNEL_TYPES.GUILD_TEXT) {
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

    const leaveMessageChannel = await getLeaveMessageChannelFromDatabase(guild.id);

    if (!leaveMessageChannel) {
      console.log('Leave message channel not set in the database.');
      return;
    }

    console.log('Retrieved leave message channel:', leaveMessageChannel);

    const leaveMessage = `The bot has been removed from a guild!\nGuild ID: ${guild.id}`;

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

    if (!channel || channel.type !== CHANNEL_TYPES.GUILD_TEXT) {
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

client.login(token);

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

async function getLeaveMessageChannelFromDatabase(guildId) {
  try {
    const [rows] = await pool.promise().query('SELECT leave_message_channel, target_guild_id FROM guilds WHERE target_guild_id = ? LIMIT 1', [guildId]);
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

async function getLeaveMessageChannelFromDatabase(guildId) {
  try {
    const [rows] = await pool.promise().query('SELECT leave_message_channel, target_guild_id FROM guilds WHERE target_guild_id = ? LIMIT 1', [guildId]);
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
