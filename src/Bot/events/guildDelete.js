const { getLeaveMessageChannelFromDatabase } = require('../database/database')

async function guildDeleteEvent (guild, client) {
  try {
    console.log(`Bot left a guild: ${guild.name} (${guild.id})`)

    const leaveMessageChannel = await getLeaveMessageChannelFromDatabase()

    if (!leaveMessageChannel) {
      console.log('Leave message channel not set in the database.')
      return
    }

    const { target_guild_id, leave_message_channel } = leaveMessageChannel
    const leaveMessage = `The bot has been removed from a guild!\nGuild Name: ${guild.name}\nGuild ID: ${guild.id}`

    const targetGuild = client.guilds.cache.get(target_guild_id)
    if (!targetGuild) {
      console.log('Target guild not found.')
      return
    }

    const channel = targetGuild.channels.cache.get(leave_message_channel)
    if (!channel || channel.type !== 'GUILD_TEXT') {
      console.log('Text channel not found in the target guild.')
      return
    }

    await channel.send(leaveMessage)
    console.log('Leave message sent successfully.')
  } catch (error) {
    console.error('Error handling guildDelete event:', error)
  }
}

module.exports = {
  guildDeleteEvent
}
