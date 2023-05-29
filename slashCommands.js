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
  const guildSpecificCommands = [];
  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = `./commands/${file}`;
    try {
      console.log(`Loading command file: ${filePath}`);
      const command = require(filePath);

      if (command.global) {
        commands.push(command.data.toJSON());
      } else {
        const guildId = '1100765844776173670'; // Replace 'YOUR_GUILD_ID' with the desired guild ID
        const guildCommand = {
          guildId,
          command: command.data.toJSON(),
          category: command.category || 'Uncategorized', // Set default category if not specified
        };
        guildSpecificCommands.push(guildCommand);
      }
    } catch (error) {
      console.error(`Error while loading command file: ${filePath}`);
      console.error(error);
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Get existing global slash commands
    const existingGlobalCommands = await rest.get(Routes.applicationCommands(clientId));
    console.log('Existing global commands fetched:', existingGlobalCommands);

    // Remove old global commands
    const deleteGlobalPromises = existingGlobalCommands.map((command) =>
      rest.delete(Routes.applicationCommand(clientId, command.id))
    );
    await Promise.all(deleteGlobalPromises);
    console.log('Old global commands deleted.');

    // Register updated global commands
    const registerGlobalPromises = [rest.post(
      Routes.applicationCommands(clientId),
      { body: commands },
    )];
    await Promise.all(registerGlobalPromises);
    console.log('Registered updated global commands.');

    // Register guild-specific commands
    for (const { guildId, command, category } of guildSpecificCommands) {
      await rest.post(
        Routes.applicationGuildCommand(clientId, guildId),
        { body: command }
      );
    }
    console.log('Added guild-specific commands.');

    console.log('Successfully refreshed application (/) commands.');

  } catch (error) {
    console.error('Error while refreshing application (/) commands:', error);
  }
};
