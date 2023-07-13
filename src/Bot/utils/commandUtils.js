const fs = require('fs')
const path = require('path')
const helpCommand = require('../commands/General/help')

function populateCommands (client) {
  const commandFiles = getAllCommandFiles(path.join(__dirname, '../commands'))

  for (const file of commandFiles) {
    try {
      const command = require(file)

      if (isValidCommand(command)) {
        client.commands.set(command.data.name, command)
      } else {
        console.warn(`Invalid command module: ${file}`)
      }
    } catch (error) {
      console.error(`Error loading command module: ${file}`, error)
    }
  }

  const commandCategories = generateCommandCategories(client.commands)
  console.log('Command categories:', commandCategories)

  if (commandCategories && Object.keys(commandCategories).length > 0) {
    console.log('Command categories populated')
    // Perform any additional actions or checks with the commandCategories array here
  } else {
    console.log('Command categories not populated')
  }

  return commandCategories
}

function getAllCommandFiles (directory) {
  const commandFiles = []

  function traverseDirectory (dir) {
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const filePath = path.join(dir, file)
      const isDirectory = fs.statSync(filePath).isDirectory()

      if (isDirectory) {
        traverseDirectory(filePath)
      } else if (file.endsWith('.js')) {
        commandFiles.push(filePath)
      }
    }
  }

  traverseDirectory(directory)

  return commandFiles
}

function isValidCommand (command) {
  return (
    typeof command === 'object' &&
    command.data &&
    typeof command.data.name === 'string' &&
    typeof command.execute === 'function'
  )
}

function generateCommandCategories (commands) {
  const commandCategories = {}

  for (const [commandName, command] of commands.entries()) {
    const category = command.category || 'Uncategorized'

    if (!commandCategories[category]) {
      commandCategories[category] = {
        name: category,
        description: '',
        commands: [],
        guildId: command.guildId,
        categoryDescription: command.categoryDescription
      }
    }

    commandCategories[category].commands.push({
      name: command.data.name,
      description: command.data.description,
      global: command.global !== false,
      categoryDescription: command.categoryDescription
    })
  }

  return Object.values(commandCategories)
}

module.exports = {
  populateCommands,
  generateCommandCategories
}
