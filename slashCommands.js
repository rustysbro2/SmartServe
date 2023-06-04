const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, guildId, token } = require('./config.js');
const fs = require('fs');
const moment = require('moment');
const pool = require('./database.js');

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

    // Read command files from the commands directory
    const commandFiles = fs.readdirSync('./commands').filter((file) => file.toLowerCase().endsWith('.js'));

    // Map command names to lowercase file names
    const commandNameToFileMap = commandFiles.reduce((map, file) => {
      const command = require(`./commands/${file}`);
      const lowerCaseName = command.data.name.toLowerCase();
      map[lowerCaseName] = file;
      return map;
    }, {});

    const deletedCommands = [];

    // Retrieve the command names from the commands directory
    const commandNamesFromDirectory = commandFiles.map((file) => {
      const command = require(`./commands/${file}`);
      return command.data.name.toLowerCase();
    });

    for (const command of commands) {
      const { name, description, options, lastModified, global } = command;
      const lowerCaseName = name.toLowerCase();
      const fileName = commandNameToFileMap[lowerCaseName];

      if (!fileName) {
        console.log(`Skipping command update due to missing command: ${JSON.stringify(command)}`);
        deletedCommands.push(command); // Add the command to the deletedCommands array
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
            // Check if the command file exists
            const commandFilePath = `./commands/${fileName}`;
            const commandFileExists = fs.existsSync(commandFilePath);

            if (commandFileExists) {
              // Check if the last modified date has changed
              const newLastModified = fs.statSync(commandFilePath).mtime;

              // Update the command and obtain the command ID only if the commandId is null or lastModified has changed
              if (command.commandId === null || !isSameLastModified(command.lastModified, newLastModified)) {
                console.log(`Updating command '${name}':`);
                console.log(`- Command ID: ${command.commandId}`);
                console.log(`- Last Modified: ${command.lastModified}`);
                console.log(`- New Last Modified: ${newLastModified}`);

                const response = await rest.patch(Routes.applicationCommand(clientId, existingGlobalCommand.id), {
                  body: commandData,
                });

                const newCommandId = response.id;

                // Update the command data in the array
                command.commandId = newCommandId;
                command.lastModified = newLastModified;

                console.log(`Command data updated: ${JSON.stringify(command)}`);
              } else {
                console.log(`Skipping command update since last modified date has not changed: ${JSON.stringify(command)}`);
              }
            } else {
              console.log(`Skipping command update due to missing command file: ${JSON.stringify(command)}`);
            }
          }

          // Delete the command if it exists as a guild-specific command
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
            // Check if the command file exists
            const commandFilePath = `./commands/${fileName}`;
            const commandFileExists = fs.existsSync(commandFilePath);

            if (commandFileExists) {
              // Check if the last modified date has changed
              const newLastModified = fs.statSync(commandFilePath).mtime;

              // Update the command and obtain the command ID only if the commandId is null or lastModified has changed
              if (command.commandId === null || !isSameLastModified(command.lastModified, newLastModified)) {
                console.log(`Updating command '${name}':`);
                console.log(`- Command ID: ${command.commandId}`);
                console.log(`- Last Modified: ${command.lastModified}`);
                console.log(`- New Last Modified: ${newLastModified}`);

                const response = await rest.patch(Routes.applicationGuildCommand(clientId, guildId, existingGuildCommand.id), {
                  body: commandData,
                });

                const newCommandId = response.id;

                // Update the command data in the array
                command.commandId = newCommandId;
                command.lastModified = newLastModified;

                console.log(`Command data updated: ${JSON.stringify(command)}`);
              } else {
                console.log(`Skipping command update since last modified date has not changed: ${JSON.stringify(command)}`);
              }
            } else {
              console.log(`Skipping command update due to missing command file: ${JSON.stringify(command)}`);
            }
          }

          // Delete the command if it exists as a global command
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

    // Delete the command data from the database for the deleted commands
    for (const command of deletedCommands) {
      const { name } = command;
      const lowerCaseName = name.toLowerCase();

      const deleteCommandQuery = `
        DELETE FROM commandIds WHERE commandName = ?
      `;

      await pool.promise().query(deleteCommandQuery, [lowerCaseName]);
      console.log(`Command data deleted: ${JSON.stringify(command)}`);
    }

    console.log('Command data updated successfully.');
  } catch (error) {
    console.error('Error updating command data:', error);
  }
}

// Helper function to check if two last modified dates are the same
function isSameLastModified(lastModified1, lastModified2) {
  const format = 'YYYY-MM-DD HH:mm:ss';
  const formatted1 = moment(lastModified1, format);
  const formatted2 = moment(lastModified2, format);
  return formatted1.isSame(formatted2);
}

module.exports = async function (client) {
  // Create the commandIds table if it doesn't exist
  await createCommandIdsTable();

  const commands = [];

  // Read command files from the commands directory
  const commandFiles = fs.readdirSync('./commands').filter((file) => file.toLowerCase().endsWith('.js'));

  // Loop through command files and register slash commands
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const setName = command.data.name.toLowerCase();
    const commandData = {
      name: setName,
      description: command.data.description,
      options: command.data.options || [], // Add the options to the command data
      commandId: null, // Set commandId to null initially
      lastModified: moment(fs.statSync(`./commands/${file}`).mtime).utc().format('YYYY-MM-DD HH:mm:ss'), // Format the last modified date in UTC
      global: command.global === undefined ? true : command.global, // Set global to true by default if not specified in the command file
    };

    // Add the command data to the commands array
    commands.push(commandData);
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