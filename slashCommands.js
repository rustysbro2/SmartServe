// slashCommands.js
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, guildId, token } = require('./config.js');
const fs = require('fs');
const { pool } = require('./database.js');

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
      const { name, description, lastModified, global } = command;
      const lowerCaseName = name.toLowerCase();
      const existingCommand = client.commands.find(cmd => cmd.data.name.toLowerCase() === lowerCaseName);

      if (!existingCommand) {
        return console.log(`Skipping command update due to missing command: ${JSON.stringify(command)}`);
      }

      const commandData = {
        name: existingCommand.data.setName,
        description: existingCommand.data.description,
      };

      try {
        if (global) {
          const existingGlobalCommand = existingGlobalCommands.find(cmd => cmd.name.toLowerCase() === lowerCaseName);

          if (!existingGlobalCommand) {
            // Register the command as a global command
            const response = await rest.post(Routes.applicationCommands(clientId), {
              body: commandData,
            });

            const commandId = response.id;

            // Update the command data in the array
            command.commandId = commandId;
            command.lastModified = new Date();

            console.log(`Command data updated: ${JSON.stringify(command)}`);
          } else {
            // Check if the command file exists
            const commandFilePath = `./commands/${name}.js`;
            const commandFileExists = fs.existsSync(commandFilePath);

            if (commandFileExists) {
              // Check if the last modified date has changed
              const newLastModified = fs.statSync(commandFilePath).mtime;

              if (newLastModified && newLastModified.getTime() !== lastModified.getTime()) {
                // Update the command and obtain the command ID
                const response = await rest.patch(Routes.applicationCommand(clientId, existingGlobalCommand.id), {
                  body: commandData,
                });

                const commandId = response.id;

                // Update the command data in the array
                command.commandId = commandId;
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

            const commandId = response.id;

            // Update the command data in the array
            command.commandId = commandId;
            command.lastModified = new Date();

            console.log(`Command data updated: ${JSON.stringify(command)}`);
          } else {
            // Check if the command file exists
            const commandFilePath = `./commands/${name}.js`;
            const commandFileExists = fs.existsSync(commandFilePath);

            if (commandFileExists) {
              // Check if the last modified date has changed
              const newLastModified = fs.statSync(commandFilePath).mtime;

              if (newLastModified && newLastModified.getTime() !== lastModified.getTime()) {
                // Update the command and obtain the command ID
                const response = await rest.patch(Routes.applicationGuildCommand(clientId, guildId, existingGuildCommand.id), {
                  body: commandData,
                });

                const commandId = response.id;

                // Update the command data in the array
                command.commandId = commandId;
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

module.exports = async function (client) {
  // Create the commandIds table if it doesn't exist
  await createCommandIdsTable();

  const commands = [];

  // Read command files from the commands directory
  const commandFiles = fs.readdirSync('./commands').filter((file) => file.toLowerCase().endsWith('.js'));

  // Loop through command files and register slash commands
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const setName = command.setName.toLowerCase();
    const commandData = {
      name: setName,
      description: command.description,
      commandId: null,
      lastModified: fs.statSync(`./commands/${file}`).mtime,
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
