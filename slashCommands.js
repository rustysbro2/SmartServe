const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token, guildId } = require('./config.js');
const fs = require('fs');
const db = require('./database.js');

function commandHasChanged(oldCommand, newCommand) {
  // Compare command properties to check for changes
  console.log('Old Command Options:', oldCommand.options);
  console.log('New Command Options:', newCommand.options);

  if (oldCommand.options === undefined && newCommand.options === undefined) {
    console.log('Command has changed: false');
    return false; // No change if both options are undefined
  }

  const oldOptions = oldCommand.options || [];
  const newOptions = newCommand.options || [];

  if (oldOptions.length !== newOptions.length) {
    console.log('Command has changed: true');
    return true; // Number of options changed
  }

  for (let i = 0; i < oldOptions.length; i++) {
    const oldOption = oldOptions[i];
    const newOption = newOptions[i];

    if (
      oldOption.type !== newOption.type ||
      oldOption.name !== newOption.name ||
      oldOption.description !== newOption.description ||
      oldOption.required !== newOption.required
    ) {
      console.log('Command has changed: true');
      return true; // Option properties changed
    }
  }

  console.log('Command has changed: false');
  return false; // No change in options
}

// Create commandIds table if it doesn't exist
db.query(
  `
  CREATE TABLE IF NOT EXISTS commandIds (
    commandName VARCHAR(255),
    commandId VARCHAR(255),
    options JSON,
    lastModified TIMESTAMP,
    PRIMARY KEY (commandName)
  )
`,
  (error) => {
    if (error) throw error;
    console.log('CommandIds table created or already exists.');
  }
);

module.exports = async function (client) {
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Get existing global slash commands
    const existingGlobalCommands = await rest.get(Routes.applicationCommands(clientId));
    console.log('Existing global commands fetched:', existingGlobalCommands.map((command) => command.name));

    // Get existing guild-specific slash commands
    const existingGuildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
    console.log('Existing guild-specific commands fetched:', existingGuildCommands.map((command) => command.name));

    const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(`./commands/${file}`);
      const commandData = command.data.toJSON();

      const existingCommand = existingGlobalCommands.find((c) => c.name === commandData.name) || existingGuildCommands.find((c) => c.name === commandData.name);
      const commandPath = `./commands/${file}`;
      const fileStats = fs.statSync(commandPath);
      const lastModified = fileStats.mtime;

      if (!existingCommand || commandHasChanged(existingCommand, commandData) || (existingCommand.lastModified && lastModified > existingCommand.lastModified)) {
        let result;

        if (existingCommand) {
          console.log(`Updating command: ${commandData.name}`);
          result = await rest.patch(Routes.applicationCommand(clientId, existingCommand.id), {
            body: commandData,
          });
        } else {
          console.log(`Creating command: ${commandData.name}`);
          result = await rest.post(Routes.applicationCommands(clientId), {
            body: commandData,
          });
        }

        // Check if result.id is defined before storing in the database
        if (result.id) {
          // Store the command id, options, and last modified timestamp in the database
          await db.query(
            `
            INSERT INTO commandIds (commandName, commandId, options, lastModified)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            commandId = VALUES(commandId),
            options = VALUES(options),
            lastModified = VALUES(lastModified)
            `,
            [commandData.name, result.id, JSON.stringify(commandData.options || []), lastModified]
          );
        } else {
          console.error(`No valid command ID received for command: ${commandData.name}`);
        }
      }
    }

    console.log('Commands updated successfully.');

    console.log('Successfully refreshed application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);
  }
};
