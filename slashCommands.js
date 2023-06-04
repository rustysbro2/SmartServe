const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, guildId, token } = require('./config.js');
const fs = require('fs');
const pool = require('./database.js');

async function createCommandIdsTable() {
  // Create commandIds table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS commandIds (
      commandName VARCHAR(255) COLLATE utf8mb4_general_ci,
      commandId VARCHAR(255),
      lastModified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (commandName)
    )
  `;

  try {
    await pool.promise().query(createTableQuery);
    console.log('CommandIds table created or already exists.');
  } catch (error) {
    console.error('Error creating commandIds table:', error);
  }
}

async function updateCommandData(commands, rest, client) {
  try {
    // Get the existing global slash commands
    const existingGlobalCommands = await rest.get(Routes.applicationCommands(clientId));

    // Get the existing guild-specific slash commands
    const existingGuildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));

    // Read command files from the commands directory
    const commandFiles = fs.readdirSync('./commands').filter((file) => file.toLowerCase().endsWith('.js'));

    // Map command names to lowercase file names
    const commandNameToFileMap = commandFiles.reduce((map, file) => {
      const command = require(`./commands/${file}`);
      const lowerCaseName = command.data.name.toLowerCase();
      map[lowerCaseName] = file;
      return map;
    }, {});

    // Create a set of lowercase command names from command files
    const commandNamesSet = new Set(Object.keys(commandNameToFileMap).map((name) => name.toLowerCase()));

    // Retrieve the commandIds and last modified dates from the database
    const [rows] = await pool.promise().query('SELECT commandName, commandId, lastModified FROM commandIds');
    const commandDataMap = rows.reduce((map, row) => {
      map[row.commandName.toLowerCase()] = { commandId: row.commandId, lastModified: row.lastModified };
      return map;
    }, {});

    // Delete commands that are in the database but no longer exist as command files
    for (const commandName in commandDataMap) {
      if (!commandNamesSet.has(commandName)) {
        const { commandId, lastModified } = commandDataMap[commandName];
        delete commandDataMap[commandName];

        // Delete the command from the database
        await pool.promise().query('DELETE FROM commandIds WHERE commandName = ?', [commandName]);

        // Delete the command from the API
        try {
          await rest.delete(Routes.applicationCommand(clientId, commandId));
          console.log(`Command deleted: ${commandName}`);
        } catch (error) {
          console.error(`Error deleting command '${commandName}' from the API:`, error);
        }
      }
    }

    // Register or update commands
    for (const command of commands) {
      const { name, description, options, global } = command;
      const lowerCaseName = name.toLowerCase();
      const fileName = commandNameToFileMap[lowerCaseName];

      if (!fileName) {
        console.log(`Skipping command update due to missing command file: ${JSON.stringify(command)}`);
        continue; // Skip to the next iteration
      }

      const commandData = {
        name: name,
        description: description,
        options: options,
      };

      try {
        if (global) {
          const existingGlobalCommand = existingGlobalCommands.find(cmd => cmd.name.toLowerCase() === lowerCaseName);

          if (!existingGlobalCommand) {
            // Register the command as a global command
            const response = await rest.post(Routes.applicationCommands(clientId), {
              body: commandData,
            });

            const newCommandId = response.id;

            // Insert the command data into the database
            await pool.promise().query('INSERT INTO commandIds (commandName, commandId, lastModified) VALUES (?, ?, ?)', [lowerCaseName, newCommandId, response.lastModified]);

            console.log(`Command registered: ${commandData.name}`);
          } else {
            const lastModified = existingGlobalCommand.lastModified;
            const dbLastModified = commandDataMap[lowerCaseName].lastModified;

            if (lastModified !== dbLastModified) {
              // Update the command as a global command
              const commandId = existingGlobalCommand.id;
              const response = await rest.patch(Routes.applicationCommand(clientId, commandId), {
                body: commandData,
              });

              // Update the last modified date in the database
              await pool.promise().query('UPDATE commandIds SET lastModified = ? WHERE commandName = ?', [response.lastModified, lowerCaseName]);

              console.log(`Command updated (last modified): ${commandData.name}`);
              console.log(`Old Modified Date: ${dbLastModified}`);
              console.log(`New Modified Date: ${response.lastModified}`);
            } else {
              console.log(`Command skipped (already registered): ${commandData.name}`);
            }
          }
        } else {
          const existingGuildCommand = existingGuildCommands.find(cmd => cmd.name.toLowerCase() === lowerCaseName);

          if (!existingGuildCommand) {
            // Register the command as a guild-specific command
            const response = await rest.post(Routes.applicationGuildCommands(clientId, guildId), {
              body: commandData,
            });

            const newCommandId = response.id;

            // Insert the command data into the database
            await pool.promise().query('INSERT INTO commandIds (commandName, commandId, lastModified) VALUES (?, ?, ?)', [lowerCaseName, newCommandId, response.lastModified]);

            console.log(`Command registered: ${commandData.name}`);
          } else {
            const lastModified = existingGuildCommand.lastModified;
            const dbLastModified = commandDataMap[lowerCaseName].lastModified;

            if (lastModified !== dbLastModified) {
              // Update the command as a guild-specific command
              const commandId = existingGuildCommand.id;
              const response = await rest.patch(Routes.applicationGuildCommand(clientId, guildId, commandId), {
                body: commandData,
              });

              // Update the last modified date in the database
              await pool.promise().query('UPDATE commandIds SET lastModified = ? WHERE commandName = ?', [response.lastModified, lowerCaseName]);

              console.log(`Command updated (last modified): ${commandData.name}`);
              console.log(`Old Modified Date: ${dbLastModified}`);
              console.log(`New Modified Date: ${response.lastModified}`);
            } else {
              console.log(`Command skipped (already registered): ${commandData.name}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error registering/updating command '${commandData.name}':`, error);
      }
    }

    console.log('Command data updated successfully.');
  } catch (error) {
    console.error('Error updating command data:', error);
  }
}

module.exports = async function (client) {
  // Create the commandIds table if it doesn't exist
  await createCommandIdsTable();

  const commands = [];

  // Read command files from the commands directory
  const commandFiles = fs.readdirSync('./commands').filter((file) => file.toLowerCase().endsWith('.js'));

  // Loop through command files and register slash commands
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const setName = command.data.name.toLowerCase();
    const commandData = {
      name: setName,
      description: command.data.description,
      options: command.data.options || [],
      global: command.global === undefined ? true : command.global,
    };

    // Add the command data to the commands array
    commands.push(commandData);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Started refreshing application (/) commands.');

    // Update the command data and register/update the slash commands
    await updateCommandData(commands, rest, client);

    console.log('Successfully refreshed application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);
  }
};
