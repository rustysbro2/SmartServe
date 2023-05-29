const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token, guildId } = require('./config.js');
const fs = require('fs');
const pool = require('./database.js');
const mysql = require('mysql2');

function commandHasChanged(oldCommand, newCommand) {
  // Compare command properties to check for changes
  return (
    oldCommand.name !== newCommand.name ||
    oldCommand.description !== newCommand.description ||
    JSON.stringify(oldCommand.options) !== JSON.stringify(newCommand.options)
  );
}

// Create commands table if it doesn't exist
function createCommandsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS commands (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      options TEXT,
      guildId VARCHAR(255),
      global BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  pool.query(createTableQuery, (error) => {
    if (error) {
      console.error('Error creating commands table:', error);
    } else {
      console.log('Commands table created or already exists');
    }
  });
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
      console.log(`Refreshing global command: ${commandData.name}`);
    } else {
      const guildCommand = commandData;
      guildCommand.guildId = guildId; // Add guildId property
      guildCommands.push(guildCommand);
      console.log(`Refreshing guild-specific command for guild ${guildId}: ${commandData.name}`);
    }
  }

  // Call createCommandsTable to create or modify the commands table
  createCommandsTable();

  try {
    console.log('Started refreshing application (/) commands.');

    // Get existing global slash commands
    const getGlobalCommandsQuery = `SELECT * FROM commands WHERE guildId IS NULL`;
    pool.query(getGlobalCommandsQuery, (error, existingGlobalCommands) => {
      if (error) {
        console.error('Error fetching existing global commands:', error);
        return;
      }

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
          const updateCommandQuery = `UPDATE commands SET description = ?, options = ? WHERE id = ?`;
          const updateCommandValues = [command.description, JSON.stringify(command.options), existingCommand.id];
          return pool.query(updateCommandQuery, updateCommandValues);
        } else {
          console.log(`Creating global command: ${command.name}`);
          const createCommandQuery = `INSERT INTO commands (name, description, options, global) VALUES (?, ?, ?, true)`;
          const createCommandValues = [command.name, command.description, JSON.stringify(command.options)];
          return pool.query(createCommandQuery, createCommandValues);
        }
      });

      // Delete global commands
      const globalDeletePromises = globalCommandsToDelete.map((command) => {
        console.log(`Deleting global command: ${command.name}`);
        const deleteCommandQuery = `DELETE FROM commands WHERE id = ?`;
        const deleteCommandValues = [command.id];
        return pool.query(deleteCommandQuery, deleteCommandValues);
      });

      Promise.all([...globalCommandPromises, ...globalDeletePromises])
        .then(() => {
          console.log('Global commands updated and deleted successfully.');

          // Get existing guild-specific slash commands
          const getGuildCommandsQuery = `SELECT * FROM commands WHERE guildId = ?`;
          const getGuildCommandsValues = [guildId];
          pool.query(getGuildCommandsQuery, getGuildCommandsValues, (error, existingGuildCommands) => {
            if (error) {
              console.error('Error fetching existing guild-specific commands:', error);
              return;
            }

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
                const updateCommandQuery = `UPDATE commands SET description = ?, options = ? WHERE id = ?`;
                const updateCommandValues = [command.description, JSON.stringify(command.options), existingCommand.id];
                return pool.query(updateCommandQuery, updateCommandValues);
              } else {
                console.log(`Creating guild-specific command: ${command.name}`);
                const createCommandQuery = `INSERT INTO commands (name, description, options, guildId, global) VALUES (?, ?, ?, ?, false)`;
                const createCommandValues = [command.name, command.description, JSON.stringify(command.options), guildId];
                return pool.query(createCommandQuery, createCommandValues);
              }
            });

            // Delete guild-specific commands
            const guildDeletePromises = guildCommandsToDelete.map((command) => {
              console.log(`Deleting guild-specific command: ${command.name}`);
              const deleteCommandQuery = `DELETE FROM commands WHERE id = ?`;
              const deleteCommandValues = [command.id];
              return pool.query(deleteCommandQuery, deleteCommandValues);
            });

            Promise.all([...guildCommandPromises, ...guildDeletePromises])
              .then(() => {
                console.log('Guild-specific commands updated and deleted successfully.');

                // Fetch and display all global commands
                const getAllGlobalCommandsQuery = `SELECT * FROM commands WHERE guildId IS NULL`;
                pool.query(getAllGlobalCommandsQuery, (error, allGlobalCommands) => {
                  if (error) {
                    console.error('Error fetching all global commands:', error);
                    return;
                  }

                  console.log('All global commands:', allGlobalCommands.map(command => command.name));

                  // Fetch and display the names of all guild-specific commands for the current guild
                  const getGuildCommandNamesQuery = `SELECT name FROM commands WHERE guildId = ?`;
                  const getGuildCommandNamesValues = [guildId];
                  pool.query(getGuildCommandNamesQuery, getGuildCommandNamesValues, (error, guildCommandNames) => {
                    if (error) {
                      console.error('Error fetching guild-specific command names:', error);
                      return;
                    }

                    console.log(`Guild-specific commands for guild ${guildId}:`, guildCommandNames.map(command => command.name));

                    // Check rate limit reset time
                    const global
