const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token, guildId } = require('./config.js');
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
  const guildCommands = {};

  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const commandData = command.data.toJSON();

    if (command.global !== false) {
      commands.push(commandData);
      console.log(`Refreshing global command: ./commands/${file}`);
    } else {
      if (!guildCommands[guildId]) {
        guildCommands[guildId] = [];
      }
      guildCommands[guildId].push(commandData);
      console.log(`Refreshing guild-specific command for guild ${guildId}: ./commands/${file}`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Get existing global slash commands
    const existingCommands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );

    console.log('Existing commands fetched:', existingCommands);

    // Remove old commands
    const deletePromises = existingCommands.map((command) =>
      rest.delete(Routes.applicationGuildCommand(clientId, guildId, command.id))
    );
    await Promise.all(deletePromises);
    console.log('Old commands deleted.');

    // Register updated commands
    const registerPromises = [rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    )];
    await Promise.all(registerPromises);
    console.log('Updated commands registered successfully.');

    // Register updated guild-specific commands
    const registerGuildPromises = [rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: guildCommands[guildId] },
    )];
    await Promise.all(registerGuildPromises);
    console.log(`Updated guild-specific commands registered successfully for guild ${guildId}.`);
  } catch (error) {
    console.error('Error while refreshing application (/) commands:', error);
  }
};
