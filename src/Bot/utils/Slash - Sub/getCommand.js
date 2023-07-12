// getCommandFiles.js
const path = require("path");
const fs = require("fs");
const { pool } = require("../../../database");

function getCommandFiles(commands, directory) {
  const absoluteDirectory = path.resolve(
    __dirname,
    "..",
    "..",
    "commands",
    directory,
  );
  const files = fs.readdirSync(absoluteDirectory);

  for (const file of files) {
    const filePath = path.join(absoluteDirectory, file);
    const isDirectory = fs.statSync(filePath).isDirectory();

    if (isDirectory) {
      console.log(`Searching for command files in subdirectory: ${filePath}`);
      getCommandFiles(commands, path.join(directory, file));
    } else if (file.toLowerCase().endsWith(".js")) {
      const commandPath = path.join(directory, file);
      const command = require(commandPath);

      const setName = command.data.name.toLowerCase();
      const commandData = {
        name: setName,
        description: command.data.description,
        options: command.data.options || [],
        commandId: null,
        lastModified: fs.statSync(filePath).mtime.toISOString().slice(0, 16),
        global: command.global === undefined ? true : command.global,
        file: filePath,
      };

      commands.push(commandData);
      console.log(`Command file found: ${filePath}`);
    }
  }
}

module.exports = getCommandFiles;
