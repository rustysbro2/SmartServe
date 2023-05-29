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
  const globalCommands = [];
  const guildCommands = {};

  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.global !== false) {
      globalCommands.push(command.data.toJSON());
      console.log(`Refreshing global command: ./commands/${file}`);
    } else {
      for (const guildId of client.guilds.cache.keys()) {
        if (!guildCommands[guildId]) {
          guildCommands[guildId] = [];
        }
        guildCommands[guildId].push(command.data.toJSON());
        console.log(`Refreshing guild-specific command for guild ${guildId}: ./commands/${file}`);
      }
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Get existing global slash commands
    const existingGlobalCommands = await rest.get(
      Routes.applicationCommands(clientId)
    );

    console.log('Existing global commands fetched:', existingGlobalCommands);

    // Remove old global commands
    const deleteGlobalPromises = existingGlobalCommands.map((command) =>
      rest.delete(Routes.applicationCommand(clientId, command.id))
    );
    await Promise.all(deleteGlobalPromises);
    console.log('Old global commands deleted.');

    // Register updated global commands
    const registerGlobalPromises = [rest.put(
      Routes.applicationCommands(clientId),
      { body: globalCommands },
    )];
    await Promise.all(registerGlobalPromises);
    console.log('Updated global commands registered successfully.');

    // Register updated guild-specific commands
    for (const guildId in guildCommands) {
      const existingGuildCommands = await rest.get(
        Routes.applicationGuildCommands(clientId, guildId)
      );

      console.log(`Existing guild-specific commands fetched for guild ${guildId}:`, existingGuildCommands);

      // Remove old guild-specific commands
      const deleteGuildPromises = existingGuildCommands.map((command) =>
        rest.delete(Routes.applicationGuildCommand(clientId, guildId, command.id))
      );
      await Promise.all(deleteGuildPromises);
      console.log(`Old guild-specific commands deleted for guild ${guildId}.`);

      // Register updated guild-specific commands
      const registerGuildPromises = [rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: guildCommands[guildId] },
      )];
      await Promise.all(registerGuildPromises);
      console.log(`Updated guild-specific commands registered successfully for guild ${guildId}.`);
    }
  } catch (error) {
    console.error('Error while refreshing application (/) commands:', error);
  }
};
