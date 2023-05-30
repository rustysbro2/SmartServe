const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token, guildId } = require('./config.js');
const fs = require('fs');
const db = require('./database.js');

function commandHasChanged(oldCommand, newCommand) {
  // Compare command properties to check for changes
  if (oldCommand.options === undefined && newCommand.options === undefined) {
    return false; // No change if both options are undefined
  }

  const oldOptions = oldCommand.options || [];
  const newOptions = newCommand.options || [];

  if (oldOptions.length !== newOptions.length) {
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
      return true; // Option properties changed
    }
  }

  return false; // No change in options
}

async function insertInitialCommands() {
  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const commandData = command.data.toJSON();

    if (command.global !== false) {
      const [row] = await db.query('SELECT * FROM commandIds WHERE commandName = ?', [commandData.name]);
      if (!row) {
        await db.query(
          `
          INSERT INTO commandIds (commandName, commandId, options, lastModified)
          VALUES (?, '', ?, ?)
          `,
          [commandData.name, JSON.stringify(commandData.options || []), fs.statSync(`./commands/${file}`).mtime]
        );
        console.log(`Command inserted into database: ${commandData.name}`);
      }
    } else {
      const guildCommand = {
        ...commandData,
        guildId: guildId,
      };
      const [row] = await db.query('SELECT * FROM commandIds WHERE commandName = ?', [commandData.name]);
      if (!row) {
        await db.query(
          `
          INSERT INTO commandIds (commandName, commandId, options, lastModified)
          VALUES (?, '', ?, ?)
          `,
          [commandData.name, JSON.stringify(guildCommand.options || []), fs.statSync(`./commands/${file}`).mtime]
        );
        console.log(`Command inserted into database: ${commandData.name}`);
      }
    }
  }
}

async function updateCommands() {
  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));
  const globalCommands = [];
  const guildCommands = [];

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const commandData = command.data.toJSON();

    if (command.global !== false) {
      globalCommands.push(commandData);
    } else {
      const guildCommand = commandData;
      guildCommand.guildId = guildId; // Add guildId property
      guildCommands.push(guildCommand);
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Get existing global slash commands
    const existingGlobalCommands = await rest.get(Routes.applicationCommands(clientId));

    // Find commands that need to be created or updated
    const globalCommandsToUpdate = globalCommands.filter((newCommand) => {
      const existingCommand = existingGlobalCommands.find((command) => command.name === newCommand.name);
      return !existingCommand || commandHasChanged(existingCommand, newCommand);
    });

    // Create or update global commands
    const globalCommandPromises = globalCommandsToUpdate.map(async (command) => {
      const existingCommand = existingGlobalCommands.find((c) => c.name === command.name);
      let result;
      if (existingCommand) {
        console.log(`Updating global command: ${command.name}`);
        result = await rest.patch(Routes.applicationCommand(clientId, existingCommand.id), {
          body: command,
        });
      } else {
        console.log(`Creating global command: ${command.name}`);
        result = await rest.post(Routes.applicationCommands(clientId), {
          body: command,
        });
      }

      // Check if result.id is defined before storing in the database
      if (result.id) {
        // Store the command id, options, and last modified timestamp in the database
        await db.query(
          `
          UPDATE commandIds
          SET commandId = ?,
              options = ?,
              lastModified = ?
          WHERE commandName = ?
          `,
          [result.id, JSON.stringify(command.options || []), fs.statSync(`./commands/${command.name}.js`).mtime, command.name]
        );

        console.log(`Command updated: ${command.name}`);
      } else {
        console.error(`No valid command ID received for global command: ${command.name}`);
      }

      return result;
    });

    await Promise.all(globalCommandPromises);
    console.log('Global commands updated successfully.');

    // Get existing guild-specific slash commands
    const existingGuildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));

    // Find commands that need to be created or updated
    const guildCommandsToUpdate = guildCommands.filter((newCommand) => {
      const existingCommand = existingGuildCommands.find((command) => command.name === newCommand.name);
      return !existingCommand || commandHasChanged(existingCommand, newCommand);
    });

    // Create or update guild-specific commands
    const guildCommandPromises = guildCommandsToUpdate.map(async (command) => {
      const existingCommand = existingGuildCommands.find((c) => c.name === command.name);
      let result;
      if (existingCommand) {
        console.log(`Updating guild-specific command: ${command.name}`);
        result = await rest.patch(Routes.applicationGuildCommand(clientId, guildId, existingCommand.id), {
          body: command,
        });
        console.log(`Updated guild-specific command: ${command.name}, response:`, result);
      } else {
        console.log(`Creating guild-specific command: ${command.name}`);
        result = await rest.post(Routes.applicationGuildCommands(clientId, guildId), {
          body: command,
        });
        console.log(`Created guild-specific command: ${command.name}, response:`, result);
      }

      // Check if result.id is defined before storing in the database
      if (result.id) {
        // Store the command id, options, and last modified timestamp in the database
        await db.query(
          `
          UPDATE commandIds
          SET commandId = ?,
              options = ?,
              lastModified = ?
          WHERE commandName = ?
          `,
          [result.id, JSON.stringify(command.options || []), fs.statSync(`./commands/${command.name}.js`).mtime, command.name]
        );

        console.log(`Command updated: ${command.name}`);
      } else {
        console.error(`No valid command ID received for guild-specific command: ${command.name}`);
        console.error('Result received:', result);
      }

      return result;
    });

    await Promise.all(guildCommandPromises);
    console.log('Guild-specific commands updated successfully.');

    console.log('Successfully refreshed application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);
  }
}

module.exports = async function (client) {
  // Create commandIds table if it doesn't exist
  db.query(
    `
    CREATE TABLE IF NOT EXISTS commandIds (
      commandName VARCHAR(255),
      commandId VARCHAR(255),
      options JSON,
      lastModified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (commandName)
    )
  `,
    (error) => {
      if (error) throw error;
      console.log('CommandIds table created or already exists.');
    }
  );

  await insertInitialCommands();
  await updateCommands();
};
