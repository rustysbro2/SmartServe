const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const { pool } = require('../../../database.js');
const dotenv = require('dotenv');
const path = require('path');

// Specify the path to the .env file
const envPath = path.join(__dirname, '..', '..', '.env');

// Load environment variables from .env file
dotenv.config({ path: envPath });

// Import the clientId and guildId from the .env file
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

async function updateCommandData(commands, rest, client) {
  try {
    // Get the existing global slash commands
    const existingGlobalCommands = await rest.get(Routes.applicationCommands(clientId));

    // Get the existing guild-specific slash commands
    const existingGuildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));

    unregisterCommandsIfFilesMissing(existingGlobalCommands, existingGuildCommands, commands, rest);

    for (const command of commands) {
      const { name, description, options, lastModified, global, file } = command;
      const lowerCaseName = name.toLowerCase();

      if (!file || !fs.existsSync(file)) {
        // Skip to the next iteration
        continue;
      }

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
            const newLastModified = fs.statSync(file).mtime;
            const lastModifiedDate = new Date(lastModified);
            const newLastModifiedDate = new Date(newLastModified);

            // Truncate milliseconds from both last modified dates
            lastModifiedDate.setMilliseconds(0);
            newLastModifiedDate.setMilliseconds(0);

            if (newLastModifiedDate > lastModifiedDate) {
              console.log(`Updating command '${name}':`);
              console.log(`- Command ID: ${command.commandId}`);
              console.log(`- Last Modified: ${lastModifiedDate}`);
              console.log(`- New Last Modified: ${newLastModifiedDate}`);

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
                await rest.delete(Routes.applicationCommand(clientId, existingGlobalCommand.id));
                console.log(`Old command deleted: ${existingGlobalCommand.name}`);
              }
            } else {
              console.log(`Skipping command update since last modified date has not changed: ${JSON.stringify(command)}`);
            }
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
            const newLastModified = fs.statSync(file).mtime;
            const lastModifiedDate = new Date(lastModified);
            const newLastModifiedDate = new Date(newLastModified);

            // Truncate milliseconds from both last modified dates
            lastModifiedDate.setMilliseconds(0);
            newLastModifiedDate.setMilliseconds(0);

            if (newLastModifiedDate > lastModifiedDate) {
              console.log(`Updating command '${name}':`);
              console.log(`- Command ID: ${command.commandId}`);
              console.log(`- Last Modified: ${lastModifiedDate}`);
              console.log(`- New Last Modified: ${newLastModifiedDate}`);

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
                await rest.delete(Routes.applicationGuildCommand(clientId, guildId, existingGuildCommand.id));
                console.log(`Old command deleted: ${existingGuildCommand.name}`);
              }
            } else {
              console.log(`Skipping command update since last modified date has not changed: ${JSON.stringify(command)}`);
            }
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
        ON DUPLICATE KEY UPDATE commandId = ?, lastModified = ?
      `;

      await pool.promise().query(insertUpdateQuery, [lowerCaseName, commandId, lastModified, commandId, lastModified]);
    }

    console.log('Command data updated successfully.');
  } catch (error) {
    console.error('Error updating command data:', error);
  }
}

async function unregisterCommandsIfFilesMissing(existingGlobalCommands, existingGuildCommands, commands, rest) {
  // Unregister global commands with missing files
  for (const existingGlobalCommand of existingGlobalCommands) {
    const lowerCaseName = existingGlobalCommand.name.toLowerCase();
    const command = commands.find(cmd => cmd.name.toLowerCase() === lowerCaseName);

    if (!command || !command.file || !fs.existsSync(command.file)) {
      await rest.delete(Routes.applicationCommand(clientId, existingGlobalCommand.id));
      console.log(`Global command unregistered due to missing file: ${existingGlobalCommand.name}`);
    }
  }

  // Unregister guild-specific commands with missing files
  for (const existingGuildCommand of existingGuildCommands) {
    const lowerCaseName = existingGuildCommand.name.toLowerCase();
    const command = commands.find(cmd => cmd.name.toLowerCase() === lowerCaseName);

    if (!command || !command.file || !fs.existsSync(command.file)) {
      await rest.delete(Routes.applicationGuildCommand(clientId, guildId, existingGuildCommand.id));
      console.log(`Guild command unregistered due to missing file: ${existingGuildCommand.name}`);
    }
  }
}

module.exports = updateCommandData;
