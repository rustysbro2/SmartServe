const { Client } = require('@discordjs/rest');
const { token } = require('./config.js');

const client = Client.create({ token: token });

client.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
client.spawn();
