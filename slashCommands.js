const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token, guildId } = require('./config.js');
const fs = require('fs');
const pool = require('./database');

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
    const commandData = command.data.toJSON();

    if (command.global !== false) {
      globalCommands.push(commandData);
      console.log(`Refreshing global command: ${command.name}`);
    } else {
      const guildCommand = commandData;
      guildCommand.guildId = guildId; // Add guildId property
      guildCommands.push(guildCommand);
      console.log(`Refreshing guild-specific command for guild ${guildId}: ${command.name}`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Get existing global slash commands
    const existingGlobalCommands = await rest.get(Routes.applicationCommands(clientId));
    console.log('Existing global commands fetched:', existingGlobalCommands.map(command => command.name));

    // Find commands that need to be created or updated
    const globalCommandsToUpdate = globalCommands.filter((newCommand) => {
      const existingCommand = existingGlobalCommands.find((command) => command.name === newCommand.name);
      return !existingCommand || commandHasChanged(existingCommand, newCommand);
    });

    // Delete commands that need to be removed
    const globalCommandsToDelete = existingGlobalCommands.filter((existingCommand) => {
      return !globalCommands.find((newCommand) => newCommand.name === existingCommand.name);
    });

    // Create or update global commands
    const globalCommandPromises = globalCommandsToUpdate.map((command) => {
      const existingCommand = existingGlobalCommands.find((c) => c.name === command.name);
      if (existingCommand) {
        console.log(`Updating global command: ${command.name}`);
        return rest.patch(Routes.applicationCommand(clientId, existingCommand.id), {
          body: command,
        });
      } else {
        console.log(`Creating global command: ${command.name}`);
        return rest.post(Routes.applicationCommands(clientId), {
          body: command,
        });
      }
    });

    // Delete global commands
    const globalDeletePromises = globalCommandsToDelete.map((command) => {
      console.log(`Deleting global command: ${command.name}`);
      return rest.delete(Routes.applicationCommand(clientId, command.id));
    });

    await Promise.all([...globalCommandPromises, ...globalDeletePromises]);
    console.log('Global commands updated and deleted successfully.');

    // Get existing guild-specific slash commands
    const existingGuildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
    console.log('Existing guild-specific commands fetched:', existingGuildCommands.map(command => command.name));

    // Find commands that need to be created or updated
    const guildCommandsToUpdate = guildCommands.filter((newCommand) => {
      const existingCommand = existingGuildCommands.find((command) => command.name === newCommand.name);
      return !existingCommand || commandHasChanged(existingCommand, newCommand);
    });

    // Delete commands that need to be removed
    const guildCommandsToDelete = existingGuildCommands.filter((existingCommand) => {
      return !guildCommands.find((newCommand) => newCommand.name === existingCommand.name);
    });

    // Create or update guild-specific commands
    const guildCommandPromises = guildCommandsToUpdate.map((command) => {
      const existingCommand = existingGuildCommands.find((c) => c.name === command.name);
      if (existingCommand) {
        console.log(`Updating guild-specific command: ${command.name}`);
        return rest.patch(Routes.applicationGuildCommand(clientId, guildId, existingCommand.id), {
          body: command,
        });
      } else {
        console.log(`Creating guild-specific command: ${command.name}`);
        return rest.post(Routes.applicationGuildCommands(clientId, guildId), {
          body: command,
        });
      }
    });

    // Delete guild-specific commands
    const guildDeletePromises = guildCommandsToDelete.map((command) => {
      console.log(`Deleting guild-specific command: ${command.name}`);
      return rest.delete(Routes.applicationGuildCommand(clientId, guildId, command.id));
    });

    await Promise.all([...guildCommandPromises, ...guildDeletePromises]);
    console.log('Guild-specific commands updated and deleted successfully.');

    // Insert or update global commands in the database
    await Promise.all(
      globalCommands.map(async (command) => {
        try {
          const [rows] = await pool.promise().query('SELECT * FROM commands WHERE name = ?', [command.name]);
          if (rows.length > 0) {
            // Update command in the database
            await pool.promise().query('UPDATE commands SET description = ?, options = ? WHERE name = ?', [
              command.description,
              JSON.stringify(command.options),
              command.name,
            ]);
          } else {
            // Insert command into the database
            await pool.promise().query('INSERT INTO commands (name, description, options) VALUES (?, ?, ?)', [
              command.name,
              command.description,
              JSON.stringify(command.options),
            ]);
          }
        } catch (error) {
          console.error('Error inserting/updating command in the database:', error);
        }
      })
    );

    // Fetch and display all global commands from the database
    const [allGlobalCommands] = await pool.promise().query('SELECT name FROM commands WHERE global = 1');
    console.log('All global commands:', allGlobalCommands.map(command => command.name));

    // Insert or update guild-specific commands in the database
    await Promise.all(
      guildCommands.map(async (command) => {
        try {
          const [rows] = await pool
            .promise()
            .query('SELECT * FROM commands WHERE name = ? AND guildId = ?', [command.name, guildId]);
          if (rows.length > 0) {
            // Update command in the database
            await pool
              .promise()
              .query('UPDATE commands SET description = ?, options = ? WHERE name = ? AND guildId = ?', [
                command.description,
                JSON.stringify(command.options),
                command.name,
                guildId,
              ]);
          } else {
            // Insert command into the database
            await pool
              .promise()
              .query('INSERT INTO commands (name, description, options, guildId) VALUES (?, ?, ?, ?)', [
                command.name,
                command.description,
                JSON.stringify(command.options),
                guildId,
              ]);
          }
        } catch (error) {
          console.error('Error inserting/updating command in the database:', error);
        }
      })
    );

    // Fetch and display the names of all guild-specific commands for the current guild from the database
    const [guildCommandNames] = await pool
      .promise()
      .query('SELECT name FROM commands WHERE global = 0 AND guildId = ?', [guildId]);
    console.log(`Guild-specific commands for guild ${guildId}:`, guildCommandNames.map(command => command.name));

    // Check rate limit reset time
    const headers = rest.lastResponse?.headers || rest.globalRateLimit?.headers;
    const globalResetTime = headers && headers['x-ratelimit-global']
      ? new Date(parseInt(headers['x-ratelimit-global'])).toLocaleString()
      : 'N/A';
    const applicationResetTime = headers && headers['x-ratelimit-reset']
      ? new Date(parseInt(headers['x-ratelimit-reset'])).toLocaleString()
      : 'N/A';

    console.log('Global Rate Limit Reset Time:', globalResetTime);
    console.log('Application Rate Limit Reset Time:', applicationResetTime);
  } catch (error) {
    if (error.code === 30034) {
      const resetTime = new Date(Date.now() + error.rawError.retry_after * 1000).toLocaleString();
      console.log('Rate limit exceeded. Retry after:', resetTime);
    } else {
      console.error('Error while refreshing application (/) commands:', error);
    }
  }
};
