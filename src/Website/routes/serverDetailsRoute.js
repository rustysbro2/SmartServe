const express = require('express')
const router = express.Router()
const dotenv = require('dotenv')
const path = require('path')
const { Client, GatewayIntentBits } = require('discord.js')
const { pool } = require('../../database')

const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath })
const token = process.env.TOKEN

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
})

// Define the setupDatabase function
async function setupDatabase () {
  try {
    const guilds = await client.guilds.fetch() // Fetch all guilds the bot is in

    const insertOrUpdateServersQuery =
      'INSERT INTO servers (id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)'

    for (const guild of guilds.values()) {
      await pool.query(insertOrUpdateServersQuery, [
        guild.id,
        guild.name,
        guild.description
      ])
    }

    console.log('Database populated successfully.')
  } catch (error) {
    console.error('Error populating database:', error)
  }
}

// Invoke the setupDatabase function

// Start the bot and connect to Discord
client.login(token)
setupDatabase()

router.get('/:id', async (req, res) => {
  const serverId = req.params.id

  try {
    const query = 'SELECT * FROM servers WHERE id = ?'
    const [server] = await pool.query(query, [serverId])

    if (server) {
      res.render('server-details', { server })
    } else {
      res.status(404).send('Server not found')
    }
  } catch (error) {
    console.error('Error retrieving server details:', error)
    res.status(500).send('Internal Server Error')
  }
})

module.exports = router
