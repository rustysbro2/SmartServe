const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token, guildId } = require('./config.js');
const fs = require('fs');

function commandHasChanged(oldCommand, newCommand) {
  // Compare command properties to check for changes
  return (
    oldCommand.name !== newCommand.name ||
    oldCommand.description !== newCommand.description ||
    JSON.stringify(oldCommand.options) !== JSON.stringify(newCommand.options)
  );
}

module.exports = async function (client) {
  const globalCommands = [];
  const guildCommands = [];

  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const commandData = command.data.toJSON();

    if (command.global !== false) {
      globalCommands.push(commandData);
      console.log(`Refreshing global command: ./commands/${file}`);
    } else {
      const guildCommand = commandData;
      guildCommand.guildId = guildId; // Add guildId property
      guildCommands.push(guildCommand);
      console.log(`Refreshing guild-specific command for guild ${guildId}: ./commands/${file}`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Get existing global slash commands
    const existingGlobalCommands = await rest.get(Routes.applicationCommands(clientId));
    console.log('Existing global commands fetched:', existingGlobalCommands);

    // Find commands that need to be created or updated
    const globalCommandsToUpdate = globalCommands.filter((newCommand) => {
      const existingCommand = existingGlobalCommands.find((command) => command.name === newCommand.name);
      return !existingCommand || commandHasChanged(existingCommand, newCommand);
    });

    // Delete commands that need to be removed
    const globalCommandsToDelete = existingGlobalCommands.filter((existingCommand) => {
      return !globalCommands.find((newCommand) => newCommand.name === existingCommand.name);
    });

    // Create or update global commands
    const globalCommandPromises = globalCommandsToUpdate.map((command) => {
      const existingCommand = existingGlobalCommands.find((c) => c.name === command.name);
      if (existingCommand) {
        console.log(`Updating global command: ${command.name}`);
        return rest.patch(Routes.applicationCommand(clientId, existingCommand.id), {
          body: command,
        });
      } else {
        console.log(`Creating global command: ${command.name}`);
        return rest.post(Routes.applicationCommands(clientId), {
          body: command,
        });
      }
    });

    // Delete global commands
    const globalDeletePromises = globalCommandsToDelete.map((command) => {
      console.log(`Deleting global command: ${command.name}`);
      return rest.delete(Routes.applicationCommand(clientId, command.id));
    });

    await Promise.all([...globalCommandPromises, ...globalDeletePromises]);
    console.log('Global commands updated and deleted successfully.');

    // Get existing guild-specific slash commands
    const existingGuildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
    console.log('Existing guild-specific commands fetched:', existingGuildCommands);

    // Find commands that need to be created or updated
    const guildCommandsToUpdate = guildCommands.filter((newCommand) => {
      const existingCommand = existingGuildCommands.find((command) => command.name === newCommand.name);
      return !existingCommand || commandHasChanged(existingCommand, newCommand);
    });

    // Delete commands that need to be removed
    const guildCommandsToDelete = existingGuildCommands.filter((existingCommand) => {
      return !guildCommands.find((newCommand) => newCommand.name === existingCommand.name);
    });

    // Create or update guild-specific commands
    const guildCommandPromises = guildCommandsToUpdate.map((command) => {
      const existingCommand = existingGuildCommands.find((c) => c.name === command.name);
      if (existingCommand) {
        console.log(`Updating guild-specific command: ${command.name}`);
        return rest.patch(Routes.applicationGuildCommand(clientId, guildId, existingCommand.id), {
          body: command,
        });
      } else {
        console.log(`Creating guild-specific command: ${command.name}`);
        return rest.post(Routes.applicationGuildCommands(clientId, guildId), {
          body: command,
        });
      }
    });

    // Delete guild-specific commands
    const guildDeletePromises = guildCommandsToDelete.map((command) => {
      console.log(`Deleting guild-specific command: ${command.name}`);
      return rest.delete(Routes.applicationGuildCommand(clientId, guildId, command.id));
    });

    await Promise.all([...guildCommandPromises, ...guildDeletePromises]);
    console.log('Guild-specific commands updated and deleted successfully.');

    // Fetch and display all global commands
    const allGlobalCommands = await rest.get(Routes.applicationCommands(clientId));
    console.log('All global commands:', allGlobalCommands);

    // Fetch and display the names of all guild-specific commands for the current guild
    const guildCommandNames = guildCommands.map((command) => command.name);
    console.log(`Guild-specific commands for guild ${guildId}:`, guildCommandNames);
  } catch (error) {
    console.error('Error while refreshing application (/) commands:', error);
  }
};
