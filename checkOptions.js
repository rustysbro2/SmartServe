require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.js');

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
  try {
    console.log('Fetching slash commands...');
    const commands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    console.log('Slash commands:', commands);

    console.log('Command Options:');
    commands.forEach((command) => {
      console.log('Command:', command.name);
      console.log('Options:', command.options);
    });
  } catch (error) {
    console.error('Error fetching slash commands:', error);
  }
})();
