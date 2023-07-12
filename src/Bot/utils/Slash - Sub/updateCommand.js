const { Routes } = require("discord-api-types/v10");
const fs = require("fs");
const { pool } = require("../../../database.js");
const dotenv = require("dotenv");
const path = require("path");

// Specify the path to the .env file
const envPath = path.join(__dirname, "..", "..", ".env");

// Load environment variables from .env file
dotenv.config({ path: envPath });

// Import the clientId and guildId from the .env file
const clientId =
  process.env.BETA === "true"
    ? process.env.BETA_CLIENT_ID
    : process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

async function getExistingCommands(rest) {
  const existingGlobalCommands = await rest.get(
    Routes.applicationCommands(clientId),
  );
  const existingGuildCommands = await rest.get(
    Routes.applicationGuildCommands(clientId, guildId),
  );

  return {
    existingGlobalCommands,
    existingGuildCommands,
  };
}

function findCommand(commands, name) {
  const lowerCaseName = name.toLowerCase();
  return commands.find((cmd) => cmd.name.toLowerCase() === lowerCaseName);
}

async function handleMissingFiles(
  commands,
  existingCommands,
  commandType,
  rest,
) {
  for (const existingCommand of existingCommands) {
    const command = findCommand(commands, existingCommand.name);
    const route =
      commandType === "global"
        ? Routes.applicationCommand(clientId, existingCommand.id)
        : Routes.applicationGuildCommand(clientId, guildId, existingCommand.id);

    if (!command || !command.file || !fs.existsSync(command.file)) {
      await rest.delete(route);
      console.log(
        `${
          commandType.charAt(0).toUpperCase() + commandType.slice(1)
        } command unregistered due to missing file: ${existingCommand.name}`,
      );
    }
  }
}

async function updateCommands(commands, existingCommands, commandType, rest) {
  for (const command of commands) {
    const { name, description, options, lastModified, global, file } = command;

    if (!file || !fs.existsSync(file)) {
      continue;
    }

    const commandData = { name, description, options };
    const existingCommand = findCommand(existingCommands, name);

    if (global === (commandType === "global")) {
      await updateOrCreateCommand(
        command,
        existingCommand,
        commandData,
        rest,
        commandType,
      );
    }
  }
}

async function updateOrCreateCommand(
  command,
  existingCommand,
  commandData,
  rest,
  commandType,
) {
  if (!existingCommand) {
    await createCommand(command, commandData, rest, commandType);
  } else {
    await updateCommandIfModified(
      command,
      existingCommand,
      commandData,
      rest,
      commandType,
    );
  }
}

async function createCommand(command, commandData, rest, commandType) {
  const route =
    commandType === "global"
      ? Routes.applicationCommands(clientId)
      : Routes.applicationGuildCommands(clientId, guildId);

  const response = await rest.post(route, { body: commandData });
  const newCommandId = response.id;

  command.commandId = newCommandId;
  command.lastModified = new Date();

  console.log(`Command created: ${JSON.stringify(command)}`);

  // Update the lastModified value in the database
  await updateLastModifiedInDB(command.name, command.lastModified);
}

async function updateCommandIfModified(
  command,
  existingCommand,
  commandData,
  rest,
  commandType,
) {
  const { file, name } = command;
  const newLastModifiedLocal = fs.statSync(file).mtime;
  const newLastModified = convertToUTC(newLastModifiedLocal);
  const lastModifiedFromDB = await getLastModifiedFromDB(command);

  const lastModifiedDate = new Date(lastModifiedFromDB);
  const newLastModifiedDate = new Date(newLastModified);

  lastModifiedDate.setMilliseconds(0);
  newLastModifiedDate.setMilliseconds(0);

  console.log(`Comparing timestamps for command '${name}':`);
  console.log(`- Last Modified (command): ${lastModifiedDate}`);
  console.log(`- New Last Modified (file): ${newLastModifiedDate}`);

  if (newLastModifiedDate > lastModifiedDate) {
    const route =
      commandType === "global"
        ? Routes.applicationCommand(clientId, existingCommand.id)
        : Routes.applicationGuildCommand(clientId, guildId, existingCommand.id);

    await updateCommand(
      command,
      existingCommand,
      commandData,
      rest,
      route,
      newLastModifiedDate,
    );
  }
}

async function updateCommand(
  command,
  existingCommand,
  commandData,
  rest,
  route,
  newLastModifiedDate,
) {
  console.log(`Updating command '${command.name}':`);
  console.log(`- Command ID: ${command.commandId}`);
  console.log(
    `- Last Modified (before update): ${new Date(command.lastModified)}`,
  );
  console.log(`- New Last Modified: ${newLastModifiedDate}`);

  const response = await rest.patch(route, { body: commandData });
  const newCommandId = response.id;

  command.commandId = newCommandId;
  command.lastModified = newLastModifiedDate;

  console.log(`Command updated: ${JSON.stringify(command)}`);
  console.log(
    `- Last Modified (after update): ${new Date(command.lastModified)}`,
  );

  if (existingCommand.name.toLowerCase() !== command.name.toLowerCase()) {
    await rest.delete(route);
    console.log(`Old command deleted: ${existingCommand.name}`);
  }

  // Update the lastModified value in the database
  await updateLastModifiedInDB(command.name, command.lastModified);
}

async function updateDatabase(commands) {
  for (const command of commands) {
    const { name, commandId, lastModified } = command;
    const lowerCaseName = name.toLowerCase();

    const insertUpdateQuery = `
      INSERT INTO commandIds (commandName, commandId, lastModified)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE commandId = ?, lastModified = ?
    `;

    await pool
      .promise()
      .query(insertUpdateQuery, [
        lowerCaseName,
        commandId,
        lastModified,
        commandId,
        lastModified,
      ]);
  }
}

async function getLastModifiedFromDB(command) {
  const { name } = command;
  const query = "SELECT lastModified FROM commandIds WHERE commandName = ?";
  const [rows] = await pool.promise().query(query, [name]);
  if (rows.length > 0) {
    return rows[0].lastModified;
  }
  return null;
}

async function updateLastModifiedInDB(commandName, lastModified) {
  const query = "UPDATE commandIds SET lastModified = ? WHERE commandName = ?";
  await pool.promise().query(query, [lastModified, commandName]);
}

async function updateCommandData(commands, rest, client) {
  try {
    const { existingGlobalCommands, existingGuildCommands } =
      await getExistingCommands(rest);

    await handleMissingFiles(commands, existingGlobalCommands, "global", rest);
    await handleMissingFiles(commands, existingGuildCommands, "guild", rest);

    await updateCommands(commands, existingGlobalCommands, "global", rest);
    await updateCommands(commands, existingGuildCommands, "guild", rest);

    await updateDatabase(commands);

    console.log("Command data updated successfully.");
  } catch (error) {
    console.error("Error updating command data:", error);
  }
}

function convertToUTC(date) {
  const utcOffsetMinutes = date.getTimezoneOffset();
  return new Date(date.getTime() + utcOffsetMinutes * 60000);
}

module.exports = updateCommandData;
