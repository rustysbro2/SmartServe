// deleteMissingCommandIds.js
const path = require('path')
const { pool } = require('../../../database.js')

async function deleteMissingCommandIds (commands) {
  const existingCommandNames = commands.map((command) =>
    command.name.toLowerCase()
  )

  // Get the command names from the database
  const selectCommandNamesQuery = `
    SELECT commandName FROM commandIds
  `

  try {
    const [rows] = await pool.promise().query(selectCommandNamesQuery)
    const commandNamesInDatabase = rows.map((row) => row.commandName)

    // Get the command names that are in the database but no longer exist in the command list
    const missingCommandNames = commandNamesInDatabase.filter(
      (commandName) => !existingCommandNames.includes(commandName)
    )

    if (missingCommandNames.length > 0) {
      // Delete the missing command IDs from the database
      const deleteQuery = `
        DELETE FROM commandIds WHERE commandName IN (?)
      `

      await pool.promise().query(deleteQuery, [missingCommandNames])
      console.log(
        'Missing command IDs deleted successfully:',
        missingCommandNames
      )
    }
  } catch (error) {
    console.error('Error deleting missing command IDs:', error)
  }
}

module.exports = deleteMissingCommandIds
