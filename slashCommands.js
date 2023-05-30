const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token } = require('./config.js');
const fs = require('fs');

const commandsFolder = './commands';
const rest = new REST({ version: '10' }).setToken(token);

async function registerCommands() {
  try {
    console.log('Started refreshing application (/) commands.');

    // Read command files from the commands folder
    const commandFiles = fs.readdirSync(commandsFolder).filter((file) => file.endsWith('.js'));

    // Fetch existing global commands
    const existingGlobalCommands = await rest.get(Routes.applicationCommands(clientId));

    // Filter out existing commands that are not in the command files
    const globalCommandsToDelete = existingGlobalCommands.filter(
      (existingCommand) => !commandFiles.includes(`${existingCommand.name}.js`)
    );

    // Create the new global commands
    const globalCommandsToUpdate = commandFiles
      .filter((file) => !existingGlobalCommands.some((command) => command.name === file.replace('.js', '')))
      .map((file) => require(`./commands/${file}`).data.toJSON());

    // Delete the unnecessary global commands
    for (const command of globalCommandsToDelete) {
      await rest.delete(Routes.applicationCommand(clientId, command.id));
      console.log(`Deleted global command: ${command.name}`);
    }

    // Register or update the global commands
    for (const command of globalCommandsToUpdate) {
      await rest.post(Routes.applicationCommands(clientId), { body: command });
      console.log(`Registered or updated global command: ${command.name}`);
    }

    console.log('Successfully refreshed application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);
  }
}

registerCommands();
