const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token } = require('./config.js');
const fs = require('fs');

async function updateCommandData(commands) {
  try {
    // Update the command objects with null commandId
    commands.forEach((command) => {
      command.commandId = null;
    });

    console.log('Command data updated successfully.');
  } catch (error) {
    console.error('Error updating command data:', error);
  }
}

module.exports = async function (client) {
  const commands = [];

  // Read command files from the commands directory
  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

  // Loop through command files and register slash commands
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const commandData = {
      name: command.data.name,
      description: command.data.description,
      options: command.data.options ? command.data.options.toJSON() : [],
    };

    // Add the command data to the commands array
    commands.push(commandData);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Update the command data
    await updateCommandData(commands);

    // Register the global slash commands
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log('Successfully refreshed application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);
  }
};
