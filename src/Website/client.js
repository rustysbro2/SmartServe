const { Client, GatewayIntentBits } = require('discord.js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

let client // Declare the client variable

function getClient () {
  if (!client) {
    if (process.env.BETA === 'true') {
      global.token = process.env.TOKEN_BETA
      global.CLIENT_ID = process.env.BETA_CLIENT_ID
      global.BOT_ID = process.env.BETA_BOT_ID
    } else {
      global.token = process.env.TOKEN
      global.CLIENT_ID = process.env.CLIENT_ID
      global.BOT_ID = process.env.BOT_ID
    }

    const token = global.token

    // Create the client if it doesn't exist
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
        // Add any other necessary intents
      ]
    })

    // Add more event listeners and functionality as needed

    // Login the bot using the bot token
    client
      .login(token)
      .then(() => {
        console.log(`Bot is ready! Logged in as ${client.user.tag}`)
      })
      .catch((error) => {
        console.error('Error logging in:', error)
      })
  }

  return client // Return the client instance
}

module.exports = {
  getClient,
  client
}
