const { ActivityType } = require('discord.js')

function updatePresence (client) {
  try {
    const guildsSize = client.guilds.cache.size
    const shardId = client.shard.ids[0]

    const presenceData = {
      activities: [
        {
          name: `${guildsSize} servers | Shard ${shardId}`,
          type: ActivityType.Watching
        }
      ],
      status: 'online'
    }

    client.user.setPresence(presenceData)
  } catch (error) {
    console.error('Error updating presence:', error)
  }
}

module.exports = {
  updatePresence
}
