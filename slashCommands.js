const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, guildId, token } = require('./config.js');
const fs = require('fs');
const { pool } = require('./database.js');

async function createCommandIdsTable() {
  // Create commandIds table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS commandIds (
      commandName VARCHAR(255),
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
    for (const command of commands) {
      const { name, description, lastModified, global } = command;
      const existingCommand = client.commands.get(name);

      if (!existingCommand) {
        return console.log(`Skipping command update due to missing command: ${JSON.stringify(command)}`);
      }

      const commandData = {
        name: existingCommand.data.name,
        description: existingCommand.data.description,
      };

      try {
        let response;

        if (global) {
          // Register as global command
          response = await rest.post(Routes.applicationCommands(clientId), {
            body: commandData,
          });
        } else {
          // Register as guild-specific command
          response = await rest.post(Routes.applicationGuildCommands(clientId, guildId), {
            body: commandData,
          });
        }

        const commandId = response.id;

        // Update the command data in the array
        command.commandId = commandId;

        // Check if the last modified date has changed
        const commandFile = `./commands/${name}.js`;
        const normalizedCommandFile = fs.readdirSync('./commands').find(file => file.toLowerCase() === `${name.toLowerCase()}.js`);
        const newLastModified = normalizedCommandFile ? fs.statSync(`./commands/${normalizedCommandFile}`).mtime : null;

        if (newLastModified && newLastModified.getTime() !== lastModified.getTime()) {
          command.lastModified = newLastModified;
          console.log(`Command data updated: ${JSON.stringify(command)}`);
        } else {
          console.log(`Skipping command update since last modified date has not changed: ${JSON.stringify(command)}`);
        }
      } catch (error) {
        console.error(`Error updating command data: ${error.message}`);
      }
    }

    // Update the command data in the database
    for (const command of commands) {
      const { name, commandId, lastModified } = command;

      const insertUpdateQuery = `
        INSERT INTO commandIds (commandName, commandId, lastModified)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE commandId = ?, lastModified = ?
      `;

      await pool.promise().query(insertUpdateQuery, [name, commandId, lastModified, commandId, lastModified]);
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
    const commandData = {
      name: command.data.name,
      description: command.data.description,
      commandId: null,
      lastModified: fs.statSync(`./commands/${file}`).mtime,
      global: command.global === undefined ? true : command.global, // Set to true if global is not specified
    };

    // Add the command data to the commands array
    commands.push(commandData);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Update the command data and register the global and guild-specific slash commands
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
