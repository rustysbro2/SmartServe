const { ShardingManager } = require('discord.js');
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

// Create a new ShardingManager object
const manager = new ShardingManager('./bot.js', {
  token: process.env.BOT_TOKEN,
});

// Listen for the shardCreate event
manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

// Start the ShardingManager
manager.spawn();
