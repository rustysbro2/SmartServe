const Discord = require('discord.js');

// Create a new ShardManager instance.
const shardManager = new Discord.ShardManager({
  clientId: 'my-bot-id',
  clientToken: 'my-bot-token',
  shards: 10, // The number of shards to create.
});

// Create a new Discord client instance for each shard.
shardManager.on('shardReady', (shard) => {
  const client = new Discord.Client({
    id: shard.clientId,
    token: shard.clientToken,
  });

  // Add your bot's commands to the client.
  client.commands.add(yourCommands);

  // Start the client.
  client.login();
});

// Start the sharding manager.
shardManager.start();
