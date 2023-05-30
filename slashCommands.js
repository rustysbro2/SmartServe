const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, guildId, token } = require('./config.js');
const fs = require('fs');
const { pool } = require('./database.js');

const rest = new REST({ version: '10' }).setToken(token);

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

async function updateCommandData(commands) {
  try {
    for (const command of commands) {
      const { commandName, commandId, lastModified } = command;

      // Retrieve the command ID from the Discord API
      const fetchedCommand = await rest.get(
        Routes.applicationGuildCommand(clientId, guildId, commandId)
      );
      const updatedCommandId = fetchedCommand.id;

      const insertUpdateQuery = `
        INSERT INTO commandIds (commandName, commandId, lastModified)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE commandId = ?, lastModified = ?
      `;

      // Update the command ID in the database
      await pool
        .promise()
        .query(insertUpdateQuery, [
          commandName,
          updatedCommandId,
          lastModified,
          updatedCommandId,
          lastModified,
        ]);

      // Update the commandId property in the commands array
      command.commandId = updatedCommandId;
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
  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

  // Loop through command files and register slash commands
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const commandData = {
      commandName: command.data.name,
      commandId: null,
      lastModified: fs.statSync(`./commands/${file}`).mtime,
    };

    // Add the command data to the commands array
    commands.push(commandData);
  }

  try {
    console.log('Started refreshing application (/) commands.');

    // Update the command data in the table
    await updateCommandData(commands);

    // Register the global slash commands
    const response = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log('Successfully refreshed application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);

    // Log the command names that caused the error
    const commandNames = commands.map((command) => command.commandName);
    const errorCommands = commandNames.map((commandName, index) => ({
      name: commandName,
      error: error.rawError.errors[index]?.name || error.error._errors[index]?.name,
    }));

    console.error('Command request body:', commandNames);
    console.error('Error commands:', errorCommands);
  }
};
