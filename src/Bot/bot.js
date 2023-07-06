require('dotenv').config();
const interactionCreateEvent = require('./events/interactionCreate');

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { updatePresence } = require('./utils/presenceUpdater');
const { handleVoteWebhook } = require('./features/voteRemind');
const { populateCommands, generateCommandCategories } = require('./utils/commandUtils');

const slashCommands = require('./slashCommands');

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

// Move the declaration of commandCategories outside the initializeBot function
let commandCategories;

async function initializeBot() {
  // Populate commands
  populateCommands(client);

  // Generate command categories

  // Start an interval to check for changes in the commands array
  const checkCommandsInterval = setInterval(() => {
    if (client.commands.size > 0) {
      // Commands array is populated, clear the interval
      clearInterval(checkCommandsInterval);

      // Generate command categories
      commandCategories = generateCommandCategories(client.commands);

      // Register slash commands
      slashCommands(client, commandCategories);
    }
  }, 1000);

  // Other initialization code

  // Start the bot
  await client.login(token);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  updatePresence(client);

  // Call other initialization functions here



  initializeBot().catch((error) => {
    console.error('Error initializing bot:', error);
  });
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

initializeBot().catch((error) => {
  console.error('Error initializing bot:', error);
});
