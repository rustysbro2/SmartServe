const Discord = require('discord.js');
const client = new Discord.Client();
const env = require('dotenv').config();
const { ShardingManager } = require('discord.js'); 
const manager = new ShardingManager('./bot.js', { token: process.env.TOKEN, totalShards: 1 }); 

client.on('ready', () => {  
    console.log('Bot is ready.');
});

client.on('message', message => {  
    if (message.content === 'Hi!') {
        message.channel.send('Hello!');
    }
});

manager.spawn();
manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
client.login(process.env.TOKEN);
