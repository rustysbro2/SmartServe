const { Client } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token } = require('./config.js');

const client = new Client();
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Deleting all commands...');

    await client.login(token);
    const guilds = client.guilds.cache.map((guild) => guild.id);

    for (const guildId of guilds) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: [] }
      );

      console.log(`All commands deleted for guild ${guildId}.`);
    }

    console.log('All commands deleted successfully.');
    client.destroy();
  } catch (error) {
    console.error('Error deleting commands:', error);
  }
})();