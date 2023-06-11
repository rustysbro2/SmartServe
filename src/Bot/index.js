const { ShardingManager } = require('discord.js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file located one directory up
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Retrieve the token and guild ID from the environment variables
const token = process.env.TOKEN;
const guildId = process.env.guildId;

const manager = new ShardingManager('./bot.js', {
  token: token,
  shardArgs: [guildId], // Pass the guild ID as an argument to the shards
});

manager.on('shardCreate', shard => {
  console.log(`Launched shard ${shard.id}`);
});

manager.spawn();
