const { ShardingManager } = require('discord.js');
const { token } = require('./config.js');

const shardCount = 4; // Specify the desired number of shards

const manager = new ShardingManager('./bot.js', { token: token, totalShards: shardCount });

manager.on('shardCreate', shard => {
  console.log(`Launched shard ${shard.id}`);
});

manager.spawn();
