const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, guildId, token } = require('./config.js');

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Fetching slash commands...');
    const commands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
    console.log('Slash commands:', commands);

    console.log('Command Options:');
    for (const command of commands) {
      console.log('Command:', command.name);
      console.log('Options:', command.options);
    }
  } catch (error) {
    console.error('Error fetching slash commands:', error.message);
  }
})();
