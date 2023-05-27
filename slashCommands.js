// slashCommands.js
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token } = require('./config.js');
const fs = require('fs');

function commandHasChanged(oldCommand, newCommand) {
  // Compare command properties to check for changes
  return (
    oldCommand.name !== newCommand.name ||
    oldCommand.description !== newCommand.description ||
    JSON.stringify(oldCommand.options) !== JSON.stringify(newCommand.options)
  );
}

module.exports = async function (client) {
  const commands = [];
  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    const guilds = client.guilds.cache.map((guild) => guild.id);

    console.log('Started refreshing application (/) commands for all guilds.');

    // Get existing global slash commands
    const existingCommands = await rest.get(Routes.applicationCommands(clientId));

    // Filter out commands that haven't changed
    const updatedCommands = commands.filter((newCommand) => {
      const existingCommand = existingCommands.find((command) => command.name === newCommand.name);
      return !existingCommand || commandHasChanged(existingCommand, newCommand);
    });

    // Remove old global commands
    const deletePromises = existingCommands.map((command) =>
      rest.delete(Routes.applicationCommand(clientId, command.id))
    );
    await Promise.all(deletePromises);

    // Register updated global commands
    const registerPromises = guilds.map((guildId) =>
      rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: updatedCommands })
    );
    await Promise.all(registerPromises);

    console.log('Successfully reloaded application (/) commands for all guilds.');
  } catch (error) {
    console.error('Error while refreshing application (/) commands.', error);
  }
};

