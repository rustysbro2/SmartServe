const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token, guildId } = require('./config.js');

const rest = new REST({ version: '10' }).setToken(token);

async function fetchSlashCommands() {
  try {
    console.log('Fetching slash commands...');
    const guildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
    const globalCommands = await rest.get(Routes.applicationCommands(clientId));

    console.log('Slash commands:');
    console.log('Guild Commands:', guildCommands);
    console.log('Global Commands:', globalCommands);

    console.log('Command Options:');
    console.log('Guild Command Options:');
    for (const command of guildCommands) {
      const options = await rest.get(Routes.applicationGuildCommand(clientId, guildId, command.id, command.version));
      console.log(`Command: ${command.name}`);
      console.log('Options:', options);
    }

    console.log('Global Command Options:');
    for (const command of globalCommands) {
      const options = await rest.get(Routes.applicationCommand(clientId, command.id));
      console.log(`Command: ${command.name}`);
      console.log('Options:', options);
    }
  } catch (error) {
    console.error('Error fetching slash commands:', error);
  }
}

fetchSlashCommands();
