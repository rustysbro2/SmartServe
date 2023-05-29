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
  const rest = new REST({ version: '10' }).setToken(token);
  const globalCommands = [];
  const guildCommands = new Map();

  console.log('Started refreshing application (/) commands.');

  // Refresh global commands
  const globalCommandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

  for (const file of globalCommandFiles) {
    const filePath = `./commands/${file}`;
    if (!fs.existsSync(filePath)) {
      console.error(`Global command file does not exist: ${filePath}`);
      continue;
    }

    try {
      console.log(`Refreshing global command: ${filePath}`);
      const command = require(filePath);

      if (command.global) {
        globalCommands.push(command.data.toJSON());
      } else {
        console.log(`Skipping non-global command: ${command.data.name}`);
      }
    } catch (error) {
      console.error(`Error while refreshing global command: ${filePath}`);
      console.error(error);
    }
  }

  try {
    console.log('Fetching existing global commands...');
    const existingGlobalCommands = await rest.get(
      Routes.applicationCommands(clientId)
    );
    console.log('Existing global commands fetched:', existingGlobalCommands);

    console.log('Deleting old global commands...');
    const deleteGlobalPromises = existingGlobalCommands.map((command) =>
      rest.delete(Routes.applicationCommand(clientId, command.id))
    );
    await Promise.all(deleteGlobalPromises);
    console.log('Old global commands deleted.');

    console.log('Registering updated global commands...');
    await rest.post(
      Routes.applicationCommands(clientId),
      { body: globalCommands }
    );
    console.log('Updated global commands registered.');
  } catch (error) {
    console.error('Error while refreshing global commands:', error);
  }

  // Refresh guild-specific commands
  const guildSpecificCommandFiles = fs.readdirSync('./commands/guilds').filter((file) => file.endsWith('.js'));

  for (const file of guildSpecificCommandFiles) {
    const filePath = `./commands/guilds/${file}`;
    if (!fs.existsSync(filePath)) {
      console.error(`Guild-specific command file does not exist: ${filePath}`);
      continue;
    }

    try {
      console.log(`Refreshing guild-specific command: ${filePath}`);
      const command = require(filePath);

      if (command.global) {
        console.log(`Skipping global command for guild-specific registration: ${command.data.name}`);
        continue;
      }

      const guildId = command.guildId;
      if (!guildCommands.has(guildId)) {
        guildCommands.set(guildId, []);
      }

      const guildCommand = {
        guildId,
        command: command.data.toJSON(),
        category: command.category || 'Uncategorized',
      };
      guildCommands.get(guildId).push(guildCommand);
    } catch (error) {
      console.error(`Error while refreshing guild-specific command: ${filePath}`);
      console.error(error);
    }
  }

  try {
    console.log('Refreshing guild-specific commands...');
    for (const [guildId, commands] of guildCommands) {
      console.log(`Fetching existing guild-specific commands for guild ID ${guildId}...`);
      const existingGuildCommands = await rest.get(
        Routes.applicationGuildCommands(clientId, guildId)
      );
      console.log(`Existing guild-specific commands fetched for guild ID ${guildId}:`, existingGuildCommands);

      console.log(`Deleting old guild-specific commands for guild ID ${guildId}...`);
      const deleteGuildPromises = existingGuildCommands.map((command) =>
        rest.delete(Routes.applicationGuildCommand(clientId, guildId, command.id))
      );
      await Promise.all(deleteGuildPromises);
      console.log(`Old guild-specific commands deleted for guild ID ${guildId}.`);

      console.log(`Registering updated guild-specific commands for guild ID ${guildId}...`);
      const registerGuildPromises = commands.map((command) =>
        rest.post(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: [command.command] }
        )
      );
      await Promise.all(registerGuildPromises);
      console.log(`Updated guild-specific commands registered for guild ID ${guildId}.`);
    }
  } catch (error) {
    console.error('Error while refreshing guild-specific commands:', error);
  }

  console.log('Command refresh completed.');
};
