const { ShardingManager } = require('discord.js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Retrieve the token from the environment variables
const token = process.env.token;

const manager = new ShardingManager('./bot.js', { token: token });

manager.on('shardCreate', shard => {
  console.log(`Launched shard ${shard.id}`);
});

manager.spawn();
