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
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
  }
});

client.on('guildCreate', async (guild) => {
  try {
    console.log(`Bot joined a new guild: ${guild.name} (${guild.id})`);

    // Retrieve the join message channel for the guild from the database
    const joinMessageChannel = await getJoinMessageChannelFromDatabase(guild.id);

    if (!joinMessageChannel) {
      console.log('Join message channel not set for this guild.');
      return;
    }

    const joinMessage = `The bot has been added to a new guild!\nGuild ID: ${guild.id}`;

    // Find the channel in the guild by its ID
    const channel = guild.channels.cache.get(joinMessageChannel);

    if (channel && channel.isText()) {
      await channel.send(joinMessage);
      console.log('Join message sent successfully.');
    } else {
      console.log('Unable to send join message: Channel not found or is not a text channel.');
    }
  } catch (error) {
    console.error('Error handling guildCreate event:', error);
  }
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.login(token);

async function getJoinMessageChannelFromDatabase(guildId) {
  try {
    const [rows] = await pool.promise().query('SELECT join_message_channel FROM guilds WHERE guild_id = ?', [guildId]);
    if (rows.length > 0) {
      return rows[0].join_message_channel;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving join message channel from the database:', error);
    throw error;
  }
}
