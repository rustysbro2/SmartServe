const { REST, Routes } = require('discord.js');
const { guildId, clientId, token } = require('./config');

// Create a REST client
const rest = new REST({ version: '10' }).setToken(token);

// Fetch the registered slash commands
async function fetchCommands() {
  try {
    const commands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );

    // Find the 'play' command
    const playCommand = commands.find(command => command.name === 'play');

    // Check if the command exists
    if (playCommand) {
      console.log('Command Options:', playCommand.options);
    } else {
      console.log('Command not found');
    }
  } catch (error) {
    console.error('Error fetching commands:', error);
  }
}

fetchCommands();
