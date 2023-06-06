const { Client, Collection, GatewayIntentBits, Presence, ActivityType } = require('discord.js');
const { token } = require('./config.js');
const inviteTracker = require('./features/inviteTracker.js');
const fs = require('fs');
const helpCommand = require('./commands/help');
const countingCommand = require('./commands/count');
const slashCommands = require('./slashCommands.js');
const pool = require('./database.js');

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
    client.user.setPresence({
      activities: [
        {
          name: `${client.guilds.cache.size} servers | Shard ${client.shard.ids[0]}`,
          type: ActivityType.WATCHING,
        },
      ],
      status: "online",
    });

    inviteTracker.execute(client);

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
    } else if (interaction.isContextMenu()) {
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

    const targetGuildId = joinMessageChannel.target_guild_id;

    const joinMessage = `The bot has been added to a new guild!\nGuild: ${guild.name} (${guild.id})`;

    const targetGuild = await client.guilds.fetch(targetGuildId, { cache: false });

    if (!targetGuild) {
      console.log('Target guild not found.');
      return;
    }

    console.log('Target Guild:', targetGuild);

    const channels = await targetGuild.channels.fetch();
    console.log('Target Guild Channels:');
    channels.forEach((channel) => {
      console.log(`Channel ID: ${channel.id}, Name: ${channel.name}, Type: ${channel.type}`);
    });

    const channel = channels.get(joinMessageChannel.join_message_channel);
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

    const leaveMessageChannel = await getLeaveMessageChannelFromDatabase(guild.id);

    if (!leaveMessageChannel) {
      console.log('Leave message channel not set in the database.');
      return;
    }

    console.log('Retrieved leave message channel:', leaveMessageChannel);

    const targetGuildId = leaveMessageChannel.target_guild_id;

    const leaveMessage = `The bot has left a guild!\nGuild: ${guild.name} (${guild.id})`;

    const targetGuild = await client.guilds.fetch(targetGuildId, { cache: false });

    if (!targetGuild) {
      console.log('Target guild not found.');
      return;
    }

    console.log('Target Guild:', targetGuild);

    const channels = await targetGuild.channels.fetch();
    console.log('Target Guild Channels:');
    channels.forEach((channel) => {
      console.log(`Channel ID: ${channel.id}, Name: ${channel.name}, Type: ${channel.type}`);
    });

    const channel = channels.get(leaveMessageChannel.leave_message_channel);
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

async function getJoinMessageChannelFromDatabase(guildId) {
  try {
    const sql = 'SELECT join_message_channel, target_guild_id FROM guilds WHERE target_guild_id = ?';
    const [rows] = await pool.promise().query(sql, [guildId]);

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
    const sql = 'SELECT leave_message_channel, target_guild_id FROM guilds WHERE target_guild_id = ?';
    const [rows] = await pool.promise().query(sql, [guildId]);

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

client.login(token);
