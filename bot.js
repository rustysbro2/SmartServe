// bot.js
const { Client, Intents } = require('discord.js');
const { token } = require('./config.js');

// List intents that the bot needs access to
const intents = new Intents([
    Intents.FLAGS.GUILDS, 
    Intents.FLAGS.GUILD_MESSAGES,
    // Add other intents here based on the needs of your bot
]);

const client = new Client({ shards: "auto", intents });

client.on('ready', () => {
    console.log(`Shard ${client.shard.ids} logged in as ${client.user.tag}!`);
});

// Add your event handlers and other code here

client.login(token);
