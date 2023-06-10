const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
const pool = require('../database.js');
const dotenv = require('dotenv');
const envFilePath = '/root/SmartAlpha/src/.env';

dotenv.config({ path: envFilePath });

const clientId = process.env.CLIENT_ID;
const guildId = process.env.guildId;
const token = process.env.token;

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

    for (const command of commands) {
      const { name, description, options, lastModified, global } = command;
      const lowerCaseName = name.toLowerCase();

      const commandData = {
        name: name,
        description: description,
        options: options,
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
            const commandFilePath = path.join(__dirname, '..', 'commands', command.fileName);
            const commandFileExists = fs.existsSync(commandFilePath);

            if (commandFileExists) {
              const newLastModified = fs.statSync(commandFilePath).mtime;

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

                if (existingGlobalCommand.name.toLowerCase() !== lowerCaseName) {
                  await rest.delete(Routes.applicationCommand(clientId, existingGlobalCommand.id));
                  console.log(`Old command deleted: ${existingGlobalCommand.name}`);
                }
              } else {
                console.log(`Skipping command update since last modified date has not changed: ${JSON.stringify(command)}`);
              }
            } else {
              console.log(`Skipping command update due to missing command file: ${JSON.stringify(command)}`);
            }
          }

          const existingGuildCommand = existingGuildCommands.find(cmd => cmd.name.toLowerCase() === lowerCaseName);
          if (existingGuildCommand) {
            await rest.delete(Routes.applicationGuildCommand(clientId, guildId, existingGuildCommand.id));
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
            const commandFilePath = path.join(__dirname, '..', 'commands', command.fileName);
            const commandFileExists = fs.existsSync(commandFilePath);

            if (commandFileExists) {
              const newLastModified = fs.statSync(commandFilePath).mtime;

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

                if (existingGuildCommand.name.toLowerCase() !== lowerCaseName) {
                  await rest.delete(Routes.applicationGuildCommand(clientId, guildId, existingGuildCommand.id));
                  console.log(`Old command deleted: ${existingGuildCommand.name}`);
                }
              } else {
                console.log(`Skipping command update since last modified date has not changed: ${JSON.stringify(command)}`);
              }
            } else {
              console.log(`Skipping command update due to missing command file: ${JSON.stringify(command)}`);
            }
          }

          const existingGlobalCommand = existingGlobalCommands.find(cmd => cmd.name.toLowerCase() === lowerCaseName);
          if (existingGlobalCommand) {
            await rest.delete(Routes.applicationCommand(clientId, existingGlobalCommand.id));
            console.log(`Command deleted as it needs to be registered as a guild-specific command: ${JSON.stringify(command)}`);
          }
        }
      } catch (error) {
        console.error(`Error updating command data: ${error.message}`);
      }
    }

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
  } catch (error) {
    console.error('Error updating command data:', error);
  }
}

async function readCommandsFromDirectory(directory) {
  const commandsPath = path.join(__dirname, directory);
  const commandFiles = fs.readdirSync(commandsPath, { withFileTypes: true });
  const commands = [];

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file.name);

    if (file.isDirectory()) {
      const subCommands = await readCommandsFromDirectory(path.join(directory, file.name));
      commands.push(...subCommands);
    } else if (file.isFile() && file.name.endsWith('.js')) {
      const command = require(filePath);
      const setName = command.data.name.toLowerCase();

      commands.push({
        name: setName,
        fileName: file.name,
        description: command.data.description,
        options: command.data.options || [],
        commandId: null,
        lastModified: fs.statSync(filePath).mtime.toISOString().slice(0, 16),
        global: command.global === undefined ? true : command.global,
      });
    }
  }

  return commands;
}


module.exports = async function (client) {
  // Create the commandIds table if it doesn't exist
  await createCommandIdsTable();

  // Read commands from the commands directory
  const commandsDirectory = path.join(__dirname, '..', 'commands');
  const commands = await readCommandsFromDirectory(commandsDirectory);

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Update the command data and register the slash commands
    await updateCommandData(commands, rest, client);

    console.log('Successfully refreshed application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);

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
