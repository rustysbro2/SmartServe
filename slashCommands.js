const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token, guildId } = require('./config.js');
const fs = require('fs');
const db = require('./database.js');

function commandHasChanged(oldCommand, newCommand) {
  if (oldCommand.options === undefined && newCommand.options === undefined) {
    return false;
  }

  const oldOptions = oldCommand.options || [];
  const newOptions = newCommand.options || [];

  if (oldOptions.length !== newOptions.length) {
    return true;
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
      return true;
    }
  }

  return false;
}

async function insertInitialCommands() {
  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));
  const initialCommands = [];

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const commandData = command.data.toJSON();
    const commandPath = `./commands/${file}`;

    const stats = fs.statSync(commandPath);
    const lastModified = stats.mtime;

    if (command.global !== false) {
      initialCommands.push({
        commandName: commandData.name,
        commandId: '',
        options: commandData.options || [],
        lastModified,
      });
    } else {
      const guildCommand = {
        ...commandData,
        guildId: guildId,
      };
      initialCommands.push({
        commandName: commandData.name,
        commandId: '',
        options: guildCommand.options || [],
        lastModified,
      });
    }
  }

  for (const command of initialCommands) {
    const result = await db.query(
      `
      INSERT INTO commandIds (commandName, commandId, options, lastModified)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      commandId = VALUES(commandId),
      options = VALUES(options),
      lastModified = VALUES(lastModified)
      `,
      [command.commandName, '', JSON.stringify(command.options), command.lastModified]
    );

    if (result.affectedRows > 0) {
      console.log(`Command inserted into database: ${command.commandName}`);
    }
  }
}

module.exports = async function (client) {
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

  const globalCommands = [];
  const guildCommands = [];

  const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const commandData = command.data.toJSON();
    const commandPath = `./commands/${file}`;

    const stats = fs.statSync(commandPath);
    const lastModified = stats.mtime;

    if (command.global !== false) {
      globalCommands.push(commandData);
      console.log(`Refreshing global command: ${commandData.name}`);
    } else {
      const guildCommand = commandData;
      guildCommand.guildId = guildId;
      guildCommands.push(guildCommand);
      console.log(`Refreshing guild-specific command for guild ${guildId}: ${commandData.name}`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    const existingGlobalCommands = await rest.get(Routes.applicationCommands(clientId));
    console.log('Existing global commands fetched:', existingGlobalCommands.map((command) => command.name));

    const globalCommandsToUpdate = globalCommands.filter((newCommand) => {
      const existingCommand = existingGlobalCommands.find((command) => command.name === newCommand.name);
      return !existingCommand || commandHasChanged(existingCommand, newCommand);
    });

    const globalCommandsToDelete = existingGlobalCommands.filter((existingCommand) => {
      return !globalCommands.find((newCommand) => newCommand.name === existingCommand.name);
    });

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

      if (result.id) {
        await db.query(
          `
          UPDATE commandIds
          SET commandId = ?,
              options = ?,
              lastModified = ?
          WHERE commandName = ?
          `,
          [result.id, JSON.stringify(command.options || []), command.lastModified, command.name]
        );

        console.log(`Command updated: ${command.name}`);
      } else {
        console.error(`No valid command ID received for global command: ${command.name}`);
      }

      return result;
    });

    const globalDeletePromises = globalCommandsToDelete.map((command) => {
      console.log(`Deleting global command: ${command.name}`);
      return rest.delete(Routes.applicationCommand(clientId, command.id));
    });

    await Promise.all([...globalCommandPromises, ...globalDeletePromises]);
    console.log('Global commands updated and deleted successfully.');

    const existingGuildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
    console.log('Existing guild-specific commands fetched:', existingGuildCommands.map((command) => command.name));

    const guildCommandsToUpdate = guildCommands.filter((newCommand) => {
      const existingCommand = existingGuildCommands.find((command) => command.name === newCommand.name);
      return !existingCommand || commandHasChanged(existingCommand, newCommand);
    });

    const guildCommandsToDelete = existingGuildCommands.filter((existingCommand) => {
      return !guildCommands.find((newCommand) => newCommand.name === existingCommand.name);
    });

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

      if (result.id) {
        await db.query(
          `
          UPDATE commandIds
          SET commandId = ?,
              options = ?,
              lastModified = ?
          WHERE commandName = ?
          `,
          [result.id, JSON.stringify(command.options || []), command.lastModified, command.name]
        );

        console.log(`Command updated: ${command.name}`);
      } else {
        console.error(`No valid command ID received for guild-specific command: ${command.name}`);
        console.error('Result received:', result);
      }

      return result;
    });

    const guildDeletePromises = guildCommandsToDelete.map((command) => {
      console.log(`Deleting guild-specific command: ${command.name}`);
      return rest.delete(Routes.applicationGuildCommand(clientId, guildId, command.id));
    });

    await Promise.all([...guildCommandPromises, ...guildDeletePromises]);
    console.log('Guild-specific commands updated and deleted successfully.');

    console.log('Successfully refreshed application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);
  }
};
