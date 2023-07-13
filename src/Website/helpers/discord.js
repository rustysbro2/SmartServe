// discord.js

const axios = require('axios')

async function getGuilds (accessToken) {
  try {
    const response = await axios.get(
      'https://discord.com/api/v10/users/@me/guilds',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    )

    return response.data
  } catch (error) {
    console.error('Error retrieving guilds:', error)
    throw new Error('Error retrieving guilds')
  }
}

module.exports = {
  getGuilds
}
