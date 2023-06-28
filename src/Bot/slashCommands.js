require('dotenv').config();

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const { pool } = require('../database.js');

// Load the variables from .env file
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;

async function createCommandIdsTable() {
  // Create commandIds table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS commandIds (
      commandName VARCHAR(255) COLLATE utf8mb4_general_ci,
      commandId VARCHAR(255),
      lastModified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (commandName)
    )
  `;

  try {
    await pool.promise().query(createTableQuery);
    console.log('CommandIds table created or already exists.');
  } catch (error) {
    console.error('Error creating commandIds table:', error);
  }
}

async function updateCommandData(commands, rest, client) {
  try {
    // Get the existing global slash commands
    const existingGlobalCommands = await rest.get(Routes.applicationCommands(clientId));

    // Get the existing guild-specific slash commands
    const existingGuildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));

    // Unregister commands that are no longer in the commands array
    for (const existingCommand of existingGlobalCommands) {
      const commandExists = commands.some(cmd => cmd.name.toLowerCase() === existingCommand.name.toLowerCase());
      if (!commandExists) {
        unregisterCommand(rest, clientId, existingCommand.id, true);
        console.log(`Command unregistered (global): ${existingCommand.name}`);
      }
    }
    for (const existingCommand of existingGuildCommands) {
      const commandExists = commands.some(cmd => cmd.name.toLowerCase() === existingCommand.name.toLowerCase());
      if (!commandExists) {
        unregisterCommand(rest, clientId, existingCommand.id, false);
        console.log(`Command unregistered (guild-specific): ${existingCommand.name}`);
      }
    }

    // Register or update commands in the commands array
    for (const command of commands) {
      const { name, description, options, lastModified, global, file } = command;
      const lowerCaseName = name.toLowerCase();

      // Check if the command file exists
      const fileExists = fs.existsSync(file);

      // Unregister the command if the file doesn't exist
      if (!fileExists) {
        if (global) {
          const existingGlobalCommand = existingGlobalCommands.find(cmd => cmd.name.toLowerCase() === lowerCaseName);
          if (existingGlobalCommand) {
            unregisterCommand(rest, clientId, existingGlobalCommand.id, true);
            console.log(`Command unregistered: ${existingGlobalCommand.name}`);
          }
        } else {
          const existingGuildCommand = existingGuildCommands.find(cmd => cmd.name.toLowerCase() === lowerCaseName);
          if (existingGuildCommand) {
            unregisterCommand(rest, clientId, existingGuildCommand.id, false);
            console.log(`Command unregistered: ${existingGuildCommand.name}`);
          }
        }
        continue; // Skip to the next iteration
      }

      const commandData = {
        name: name, // Use the original command name
        description: description,
        options: options, // Add the options to the command data
      };

      try {
        if (global) {
          const existingGlobalCommand = existingGlobalCommands.find(cmd => cmd.name.toLowerCase() === lowerCaseName);

          if (!existingGlobalCommand) {
            // Register the command as a global command
            const response = await rest.post(Routes.applicationCommands(clientId), {
              body: commandData,
            });

            const newCommandId = response.id;

            // Update the command data in the array
            command.commandId = newCommandId;
            command.lastModified = new Date();

            console.log(`Command data updated: ${JSON.stringify(command)}`);
          } else {
            // Check if the last modified date has changed
            const newLastModified = fs.statSync(file).mtime;

            // Update the command and obtain the command ID only if the commandId is null or lastModified has changed
            if (command.commandId === null || (newLastModified && newLastModified.toISOString().slice(0, 16) !== lastModified.toISOString().slice(0, 16))) {
              console.log(`Updating command '${name}':`);
              console.log(`- Command ID: ${command.commandId}`);
              console.log(`- Last Modified: ${lastModified}`);
              console.log(`- New Last Modified: ${newLastModified}`);

              const response = await rest.patch(Routes.applicationCommand(clientId, existingGlobalCommand.id), {
                body: commandData,
              });

              const newCommandId = response.id;

              // Update the command data in the array
              command.commandId = newCommandId;
              command.lastModified = newLastModified;

              console.log(`Command data updated: ${JSON.stringify(command)}`);

              // Delete the old command if the name has changed
              if (existingGlobalCommand.name.toLowerCase() !== lowerCaseName) {
                unregisterCommand(rest, clientId, existingGlobalCommand.id, true);
                console.log(`Old command deleted: ${existingGlobalCommand.name}`);
              }
            } else {
              console.log(`Skipping command update since last modified date has not changed: ${JSON.stringify(command)}`);
            }
          }

          // Delete the command if it exists as a guild-specific command
          const existingGuildCommand = existingGuildCommands.find(cmd => cmd.name.toLowerCase() === lowerCaseName);
          if (existingGuildCommand) {
            unregisterCommand(rest, clientId, existingGuildCommand.id, false);
            console.log(`Command deleted as it needs to be registered as a global command: ${JSON.stringify(command)}`);
          }
        } else {
          const existingGuildCommand = existingGuildCommands.find(cmd => cmd.name.toLowerCase() === lowerCaseName);

          if (!existingGuildCommand) {
            // Register the command as a guild-specific command
            const response = await rest.post(Routes.applicationGuildCommands(clientId, guildId), {
              body: commandData,
            });

            const newCommandId = response.id;

            // Update the command data in the array
            command.commandId = newCommandId;
            command.lastModified = new Date();

            console.log(`Command data updated: ${JSON.stringify(command)}`);
          } else {
            // Check if the last modified date has changed
            const newLastModified = fs.statSync(file).mtime;

            // Update the command and obtain the command ID only if the commandId is null or lastModified has changed
            if (command.commandId === null) {
              console.log(`Updating command '${name}':`);
              console.log(`- Command ID: ${command.commandId}`);
              console.log(`- Last Modified: ${lastModified}`);
              console.log(`- New Last Modified: ${newLastModified}`);

              const response = await rest.patch(Routes.applicationGuildCommand(clientId, guildId, existingGuildCommand.id), {
                body: commandData,
              });

              const newCommandId = response.id;

              // Update the command data in the array
              command.commandId = newCommandId;
              command.lastModified = newLastModified;

              console.log(`Command data updated: ${JSON.stringify(command)}`);

              // Delete the old command if the name has changed
              if (existingGuildCommand.name.toLowerCase() !== lowerCaseName) {
                unregisterCommand(rest, clientId, existingGuildCommand.id, false);
                console.log(`Old command deleted: ${existingGuildCommand.name}`);
              }
            } else {
              console.log(`Skipping command update since last modified date has not changed: ${JSON.stringify(command)}`);
            }
          }

          // Delete the command if it exists as a global command
          const existingGlobalCommand = existingGlobalCommands.find(cmd => cmd.name.toLowerCase() === lowerCaseName);
          if (existingGlobalCommand) {
            unregisterCommand(rest, clientId, existingGlobalCommand.id, true);
            console.log(`Command deleted as it needs to be registered as a guild-specific command: ${JSON.stringify(command)}`);
          }
        }
      } catch (error) {
        console.error(`Error updating command data: ${error.message}`);
      }
    }

    // Update the command data in the database
    for (const command of commands) {
      const { name, commandId, lastModified } = command;
      const lowerCaseName = name.toLowerCase();

      const insertUpdateQuery = `
        INSERT INTO commandIds (commandName, commandId, lastModified)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE commandId = IF(?, commandId, commandId), lastModified = ?
      `;

      await pool.promise().query(insertUpdateQuery, [lowerCaseName, commandId, lastModified, commandId, lastModified]);
    }

    console.log('Command data updated successfully.');

    // Debug: Log all registered commands
    console.log('Registered commands:');
    console.log('Global commands:');
    for (const command of existingGlobalCommands) {
      console.log(`- Name: ${command.name}, ID: ${command.id}`);
    }
    console.log('Guild-specific commands:');
    for (const command of existingGuildCommands) {
      console.log(`- Name: ${command.name}, ID: ${command.id}`);
    }
  } catch (error) {
    console.error('Error updating command data:', error);
  }
}

async function unregisterCommand(rest, clientId, commandId, global) {
  try {
    if (global) {
      await rest.delete(Routes.applicationCommand(clientId, commandId));
    } else {
      await rest.delete(Routes.applicationGuildCommand(clientId, guildId, commandId));
    }
  } catch (error) {
    console.error('Error unregistering command:', error);
  }
}

module.exports = async function (client) {
  // Create the commandIds table if it doesn't exist
  await createCommandIdsTable();

  const commands = [];

  // Read command files from the commands directory and its subdirectories
  const commandDirectory = './commands';
  console.log(`Searching for command files in directory: ${commandDirectory}`);
  getCommandFiles(commandDirectory);

  function getCommandFiles(directory) {
    const files = fs.readdirSync(directory);

    for (const file of files) {
      const filePath = `${directory}/${file}`;
      const isDirectory = fs.statSync(filePath).isDirectory();

      if (isDirectory) {
        console.log(`Searching for command files in subdirectory: ${filePath}`);
        getCommandFiles(filePath);
      } else if (file.toLowerCase().endsWith('.js')) {
        const command = require(filePath);
        const setName = command.data.name.toLowerCase();
        const commandData = {
          name: setName,
          description: command.data.description,
          options: command.data.options || [], // Add the options to the command data
          commandId: null, // Set commandId to null initially
          lastModified: fs.statSync(filePath).mtime.toISOString().slice(0, 16), // Get the ISO string of the last modified date without seconds
          global: command.global === undefined ? true : command.global, // Set global to true by default if not specified in the command file
          file: filePath, // Store the file path for reference
        };

        // Add the command data to the commands array
        commands.push(commandData);
        console.log(`Command file found: ${filePath}`);
      }
    }
  }

  // Retrieve the commandIds from the database and update the commandData object
  const selectCommandIdsQuery = `
    SELECT commandName, commandId, lastModified FROM commandIds
  `;

  const [rows] = await pool.promise().query(selectCommandIdsQuery);
  const commandIdMap = rows.reduce((map, row) => {
    map[row.commandName] = { commandId: row.commandId, lastModified: row.lastModified };
    return map;
  }, {});

  for (const command of commands) {
    const { name } = command;
    const lowerCaseName = name.toLowerCase();

    if (commandIdMap[lowerCaseName]) {
      const { commandId, lastModified } = commandIdMap[lowerCaseName];
      command.commandId = commandId;
      command.lastModified = lastModified;
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Update the command data and register the slash commands
    await updateCommandData(commands, rest, client);

    console.log('Successfully refreshed application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);

    // Log the command names that caused the error
    const commandNames = commands.map((command) => command.name);
    const errorCommands = commandNames.map((commandName, index) => ({
      name: commandName,
      error: error.rawError.errors[index] || error,
    }));

    console.error('Error commands:');
    for (const errorCommand of errorCommands) {
      console.error(`- Command: ${errorCommand.name}`);
      console.error(`  Error: ${JSON.stringify(errorCommand.error)}`);
    }
  }
};
