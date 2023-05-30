const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, guildId, token } = require('./config.js');
const fs = require('fs');
const { pool } = require('./database.js');

async function createCommandIdsTable() {
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

      const insertUpdateQuery = `
        INSERT INTO commandIds (commandName, commandId, lastModified)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE commandId = ?, lastModified = ?
      `;

      await pool.promise().query(insertUpdateQuery, [commandName, commandId, lastModified, commandId, lastModified]);
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

  console.log('Commands to register:', commands);

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Update the command data in the table
    await updateCommandData(commands);

    console.log('Command data after update:', commands);

    // Register the guild-specific slash commands
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });

    console.log('Successfully refreshed application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);
  }
};
