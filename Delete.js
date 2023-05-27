const { Client, GatewayIntentBits } = require('discord.js');
const { clientId, token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);

  try {
    const commands = await client.application.commands.fetch();

    for (const command of commands.values()) {
      await command.delete();
      console.log(`Deleted command "${command.name}"`);
    }

    console.log('All global commands deleted successfully.');
  } catch (error) {
    console.error('Error deleting global commands:', error);
  }

  client.destroy();
});

client.login(token);
