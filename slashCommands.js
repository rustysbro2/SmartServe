const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, guildId, token } = require('./config.js');
const fs = require('fs');
const { query } = require('./database.js');

// Function to insert or update a command in the database
async function upsertCommand(commandName, commandId, options) {
  const queryStr = `
    INSERT INTO commandIds (commandName, commandId, options)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
    commandId = VALUES(commandId),
    options = VALUES(options)
  `;

  try {
    await query(queryStr, [commandName, commandId, JSON.stringify(options)]);
    console.log(`Command '${commandName}' upserted successfully.`);
  } catch (error) {
    console.error(`Error upserting command '${commandName}':`, error);
  }
}

module.exports = async function (client) {
  const commands = [];

  // Read command files from the commands directory
  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

  // Loop through command files and register slash commands
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const commandData = command.data.toJSON();

    // Add the command data to the commands array
    commands.push(commandData);

    // Upsert the command in the database
    await upsertCommand(commandData.name, '', commandData.options || []);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Register the global slash commands
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });

    console.log('Successfully refreshed application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);
  }
};
