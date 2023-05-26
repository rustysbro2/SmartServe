const { Client } = require('discord.js');

const client = new Client({
  shards: 10,
  autoSharding: true,
});

client.on('ready', async () => {
  console.log(`Shard ${client.shard.ids} logged in as ${client.user.tag}!`);
  client.user.setActivity(`${client.guilds.cache.size} servers | Shard ${client.shard.ids[0]}`, { type: 'WATCHING' });
});

client.on('message', async (message) => {
  if (message.content.startsWith(config.prefix)) {
    const command = await client.commands.find(command => command.name === message.content.slice(config.prefix.length));

    if (command) {
      try {
        await command.execute(message);
      } catch (error) {
        console.error(error);
      }
    }
  }
});

client.login(process.env.TOKEN);
