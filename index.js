// index.js
const { Discord } = require('discord.js/lib/client');
const { token } = require('./config.js');

const manager = new Discord.ShardingManager('./bot.js', { token: token });

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
manager.spawn();
