const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token, guildId } = require('./config.js');
const fs = require('fs');
const db = require('./database.js');

function commandHasChanged(oldCommand, newCommand) {
  // Compare command properties to check for changes
  if (oldCommand.options === undefined && newCommand.options === undefined) {
    return false; // No change if both options are undefined
  }

  const oldOptions = oldCommand.options || [];
  const newOptions = newCommand.options || [];

  if (oldOptions.length !== newOptions.length) {
    return true; // Number of options changed
  }

  for (let i = 0; i < oldOptions.length; i++) {
    const oldOption = oldOptions[i];
    const newOption = newOptions[i];

    if (
      oldOption.type !== newOption.type ||
      oldOption.name !== newOption.name ||
      oldOption.description !== newOption.description ||
      oldOption.required !== newOption.required
    ) {
      return true; // Option properties changed
    }
  }

  return false; // No change in options
}

// Create commandIds table if it doesn't exist
db.query(
  `
  CREATE TABLE IF NOT EXISTS commandIds (
    commandName VARCHAR(255),
    commandId VARCHAR(255),
    options JSON,
    lastModified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (commandName)
  )
`,
  (error) => {
    if (error) throw error;
    console.log('CommandIds table created or already exists.');
  }
);

module.exports = async function (client) {
  const globalCommands = [];
  const guildCommands = [];

  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const commandData = command.data.toJSON();

    if (command.global !== false) {
      globalCommands.push(commandData);
      console.log(`Refreshing global command: ${commandData.name}`);
    } else {
      const guildCommand = commandData;
      guildCommand.guildId = guildId; // Add guildId property
      guildCommands.push(guildCommand);
      console.log(`Refreshing guild-specific command for guild ${guildId}: ${commandData.name}`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Get existing global slash commands
    const existingGlobalCommands = await rest.get(Routes.applicationCommands(clientId));
    console.log('Existing global commands fetched:', existingGlobalCommands.map((command) => command.name));

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
    const globalCommandPromises = globalCommandsToUpdate.map(async (command) => {
      const existingCommand = existingGlobalCommands.find((c) => c.name === command.name);
      let result;
      if (existingCommand) {
        console.log(`Updating global command: ${command.name}`);
        result = await rest.patch(Routes.applicationCommand(clientId, existingCommand.id), {
          body: command,
        });
      } else {
        console.log(`Creating global command: ${command.name}`);
        result = await rest.post(Routes.applicationCommands(clientId), {
          body: command,
        });
      }

      // Check if result.id is defined before storing in the database
      if (result.id) {
        // Store the command id, options, and last modified timestamp in the database
        await db.query(
          `
          INSERT INTO commandIds (commandName, commandId, options)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
          commandId = VALUES(commandId),
          options = VALUES(options),
          lastModified = CURRENT_TIMESTAMP
          `,
          [command.name, result.id, JSON.stringify(command.options || [])]
        );

        // Log command update
        console.log(`Command updated: ${command.name}`);
      } else {
        console.error(`No valid command ID received for global command: ${command.name}`);
      }

      return result;
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
    console.log('Existing guild-specific commands fetched:', existingGuildCommands.map((command) => command.name));

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
    const guildCommandPromises = guildCommandsToUpdate.map(async (command) => {
      const existingCommand = existingGuildCommands.find((c) => c.name === command.name);
      let result;
      if (existingCommand) {
        console.log(`Updating guild-specific command: ${command.name}`);
        result = await rest.patch(Routes.applicationGuildCommand(clientId, guildId, existingCommand.id), {
          body: command,
        });
        console.log(`Updated guild-specific command: ${command.name}, response:`, result);
      } else {
        console.log(`Creating guild-specific command: ${command.name}`);
        result = await rest.post(Routes.applicationGuildCommands(clientId, guildId), {
          body: command,
        });
        console.log(`Created guild-specific command: ${command.name}, response:`, result);
      }

      // Check if result.id is defined before storing in the database
      if (result.id) {
        // Store the command id, options, and last modified timestamp in the database
        await db.query(
          `
          INSERT INTO commandIds (commandName, commandId, options)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
          commandId = VALUES(commandId),
          options = VALUES(options),
          lastModified = CURRENT_TIMESTAMP
          `,
          [command.name, result.id, JSON.stringify(command.options || [])]
        );

        // Log command update
        console.log(`Command updated: ${command.name}`);
      } else {
        console.error(`No valid command ID received for guild-specific command: ${command.name}`);
        console.error('Result received:', result);
      }

      return result;
    });

    // Delete guild-specific commands
    const guildDeletePromises = guildCommandsToDelete.map((command) => {
      console.log(`Deleting guild-specific command: ${command.name}`);
      return rest.delete(Routes.applicationGuildCommand(clientId, guildId, command.id));
    });

    await Promise.all([...guildCommandPromises, ...guildDeletePromises]);
    console.log('Guild-specific commands updated and deleted successfully.');

    console.log('Successfully refreshed application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);
  }
};
