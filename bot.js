// bot.js
// /
const { Client } = require('discord.js');
const { token } = require('./config.js');

const client = new Client({ shards: "auto" });

client.on('ready', () => {
    console.log(`Shard ${client.shard.ids} logged in as ${client.user.tag}!`);
});

// Add your event handlers and other code here

client.login(token);
