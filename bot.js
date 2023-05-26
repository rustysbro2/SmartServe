const Discord = require('discord.js');

const ShardingManager = require('discord.js').ShardingManager;

const { TOKEN } = require('./.env');

const bot = new ShardingManager({
  clientOptions: {
    token: TOKEN,
  },
  shardCount: 10, // The number of shards to create.
});

bot.on('ready', () => {
  console.log('Bot is ready!');
});

bot.on('message', (message) => {
  if (message.content === 'ping') {
    message.channel.send('pong');
  }
});

bot.login(); // This will automatically spawn the shards.
