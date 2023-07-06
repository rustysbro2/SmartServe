const { ShardingManager } = require('discord.js');

const path = require('path');
const dotenvPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: dotenvPath });

const token = process.env.TOKEN;

const manager = new ShardingManager('./bot.js', { token: token });

manager.on('shardCreate', shard => {
  console.log(`Launched shard ${shard.id}`);
});

manager.spawn();