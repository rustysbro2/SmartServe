const { Client, Events, GatewayIntentBits } = require('discord.js');
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

// Create a new Client object
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Listen for the InteractionCreate event
client.on(Events.InteractionCreate, interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'stats') {
    return interaction.reply(`Server count: ${client.guilds.cache.size}.`);
  }
});

// Login with the bot's token
client.login(process.env.BOT_TOKEN);
