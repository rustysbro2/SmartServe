const path = require("path");
const dotenv = require("dotenv");
const { REST } = require("@discordjs/rest");
const fs = require("fs");
const updateCommandData = require("./Slash - Sub/updateCommand");
const deleteMissingCommandIds = require("./Slash - Sub/deleteMissing");
const getCommandFiles = require("./Slash - Sub/getCommand");

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

module.exports = async function (client) {
  const commands = [];

  // Read command files from the commands directory and its subdirectories
  const commandDirectory = path.join(__dirname, "..", "commands");
  console.log(`Searching for command files in directory: ${commandDirectory}`);
  getCommandFiles(commands, commandDirectory);

  try {
    console.log("Started refreshing application (/) commands.");

    // Create a new REST client and set the token
    const rest = new REST({ version: "10" }).setToken(global.token);
    console.log("Token:", global.token);

    // Manually define the GUILD_ID and CLIENT_ID for testing
    const GUILD_ID = process.env.GUILD_ID;
    const CLIENT_ID = process.env.CLIENT_ID;

    // Update the command data and register the slash commands
    await updateCommandData(commands, rest, CLIENT_ID, GUILD_ID);

    // Delete missing command IDs from the database
    await deleteMissingCommandIds(commands);

    console.log("Successfully refreshed application (/) commands.");
  } catch (error) {
    console.error("Error refreshing application (/) commands:", error);
  }
};
