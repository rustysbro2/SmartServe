const { ShardingManager } = require('discord.js');
const { token } = require('./config.js');
const voiceStateHandler = require('./voiceStateHandler.js');

const manager = new ShardingManager('./bot.js', { token: token });

manager.on('shardCreate', shard => {
  console.log(`Launched shard ${shard.id}`);
  voiceStateHandler(shard.client); // Pass the client object to the handler
});

manager.spawn();
