const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, token } = require('./config.js');

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
  const commands = await rest.get(Routes.applicationCommands(clientId));

  for (let command of commands) {
    console.log(`Deleting command ${command.name}`);
    await rest.delete(Routes.applicationCommand(clientId, command.id));
  }
  
  console.log('All commands deleted successfully.');
})();
