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
      options JSON,
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
      const { commandName, commandId, options } = command;
      
      const insertUpdateQuery = `
        INSERT INTO commandIds (commandName, commandId, options)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE commandId = ?, options = ?
      `;
      
      await pool.promise().query(insertUpdateQuery, [commandName, commandId, options, commandId, options]);
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
    const commandData = command.data.toJSON();

    // Add the command data to the commands array
    commands.push(commandData);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Update the command data in the table
    await updateCommandData(commands);

    // Register the global slash commands
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });

    console.log('Successfully refreshed application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);
  }
};
