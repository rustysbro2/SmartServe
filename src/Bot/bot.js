require('dotenv').config();

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { updatePresence } = require('./utils/presenceUpdater');
const { handleVoteWebhook } = require('./features/voteRemind');
const { populateCommands, generateCommandCategories } = require('./utils/commandUtils');

const slashCommands = require('./utils/slashCommands');
const interactionCreateEvent = require('./events/interactionCreate');

const token = process.env.TOKEN;
const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildPresences,
];

const client = new Client({
  shardReadyTimeout: Number.MAX_SAFE_INTEGER,
  shards: 'auto',
  intents,
});

client.commands = new Collection();
client.musicPlayers = new Map();

let commandCategories;

// Populate commands and generate command categories
populateCommands(client);
commandCategories = generateCommandCategories(client.commands);

// Register slash commands
slashCommands(client, commandCategories);

client.on('ready', () => {
  console.log(`Shard ${client.shard.ids[0]} is ready!`);
  updatePresence(client);

  // Call other initialization functions here

  // Login the client after all initialization is complete
  client.login(token);
});

client.on('interactionCreate', async (interaction) => {
  interactionCreateEvent(interaction, client, commandCategories);
});

client.on('guildMemberAdd', (member) => {
  // Call your guildMemberAdd event function
  const { guildMemberAddEvent } = require('./events/guildMemberAdd');
  guildMemberAddEvent(member, client);
});

client.on('guildCreate', (guild) => {
  // Call your guildCreate event function
  const guildCreateEvent = require('./events/guildCreate');
  guildCreateEvent(guild, client);
});

client.on('guildDelete', (guild) => {
  // Call your guildDelete event function
  const guildDeleteEvent = require('./events/guildDelete');
  guildDeleteEvent(guild, client);
});

client.on('error', (error) => {
  // Call your error event function
  const errorEvent = require('./events/error');
  errorEvent(error);
});

// Add more client.on statements for other event functions

// Util Functions

// Define your util functions here


