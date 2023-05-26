const { Client, Intents } = require('discord.js');
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

// Create a new Discord client object
const client = new Discord.Client({
  intents: ["guilds", "channels", "messages", "presences"],
  shardCount: 10,
  shardThreshold: 1000,
});

// Create a new ShardingManager object
const shardingManager = new Discord.ShardingManager(client);

// Start the ShardingManager
shardingManager.start();

// Listen for the ready event
client.on("ready", () => {
  console.log("Bot is ready!");
});

// Listen for the message event
client.on("message", (message) => {
  // Do something with the message
});

// Login with the bot's token
client.login(process.env.BOT_TOKEN);
