const { Client } = require('@discordjs/rest');
const { token } = require('./config.js');

const manager = new Client('./bot.js', { token: token });

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
manager.spawn();
