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
  const guildCommands = [];

  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.global !== false) {
      globalCommands.push(command.data.toJSON());
      console.log(`Refreshing global command: ./commands/${file}`);
    } else {
      const guildCommand = command.data.toJSON();
      guildCommands.push(guildCommand);
      console.log(`Refreshing guild-specific command: ./commands/${file}`);
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
      { headers: { 'Content-Type': 'application/json' } } // Set Content-Type header
    )];
    await Promise.all(registerGlobalPromises);
    console.log('Updated global commands registered successfully.');

    // Fetch and display all guild-specific commands for each guild
    client.guilds.cache.forEach(async (guild) => {
      const guildId = guild.id;

      // Register updated guild-specific commands for the current guild
      const filteredGuildCommands = guildCommands.filter((command) => command.guildId === guildId);
      const registerGuildPromises = [rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: filteredGuildCommands },
        { headers: { 'Content-Type': 'application/json' } } // Set Content-Type header
      )];
      await Promise.all(registerGuildPromises);
      console.log(`Updated guild-specific commands registered successfully for guild ${guildId}.`);

      // Fetch and display all guild-specific commands for the current guild
      const allGuildCommands = await rest.get(
        Routes.applicationGuildCommands(clientId, guildId)
      );
      console.log(`All guild-specific commands for guild ${guildId}:`, allGuildCommands);
    });

    // Fetch and display all global commands
    const allGlobalCommands = await rest.get(
      Routes.applicationCommands(clientId)
    );
    console.log('All global commands:', allGlobalCommands);
  } catch (error) {
    console.error('Error while refreshing application (/) commands:', error);
  }
};
