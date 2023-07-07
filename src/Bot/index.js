const { ShardingManager } = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const token = process.env.TOKEN;

const manager = new ShardingManager('./bot.js', { token: token });

manager.on('shardCreate', shard => {
  console.log(`Launched shard ${shard.id}`);
});

manager.spawn();
