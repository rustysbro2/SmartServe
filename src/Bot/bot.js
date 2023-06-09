const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const { Client, Collection, GatewayIntentBits } = require('discord.js')
const { updatePresence } = require('./utils/presenceUpdater')
const { startWebServer } = require('./Express - Vote/VoteWebserver')
const {
  checkAllGuildMembers,
  sendRecurringReminders
} = require('./features/voteRemind')
const {
  populateCommands,
  generateCommandCategories
} = require('./utils/commandUtils')
const {
  setCountingChannel,
  getCountingChannelId,
  handleCountingMessage,
  loadCountingChannels
} = require('./features/countGame')
const { getStrikeEmbed } = require('./features/strikeLogic')

const slashCommands = require('./utils/slashCommands')
const interactionCreateEvent = require('./events/interactionCreate')

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
const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildInvites,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildPresences,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMessageTyping,
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.DirectMessageReactions,
  GatewayIntentBits.DirectMessageTyping,
  GatewayIntentBits.MessageContent
]

const client = new Client({
  shardReadyTimeout: Number.MAX_SAFE_INTEGER,
  shards: 'auto',
  intents
})

client.commands = new Collection()
client.musicPlayers = new Map()

let commandCategories

// Populate commands and generate command categories
populateCommands(client)
commandCategories = generateCommandCategories(client.commands)

// Register slash commands
slashCommands(client, commandCategories)

client.on('ready', () => {
  console.log(`Shard ${client.shard.ids[0]} is ready!`)
  updatePresence(client)
  loadCountingChannels()
  // Call other initialization functions here
  startWebServer(client)
})

client.on('interactionCreate', async (interaction) => {
  interactionCreateEvent(interaction, client, commandCategories)
})

client.on('guildMemberAdd', (member) => {
  // Call your guildMemberAdd event function
  const { guildMemberAddEvent } = require('./events/guildMemberAdd')
  guildMemberAddEvent(member, client)
})

client.on('guildCreate', (guild) => {
  // Call your guildCreate event function
  const guildCreateEvent = require('./events/guildCreate')
  guildCreateEvent(guild, client)
})

client.on('guildDelete', (guild) => {
  // Call your guildDelete event function
  const guildDeleteEvent = require('./events/guildDelete')
  guildDeleteEvent(guild, client)
})

client.on('error', (error) => {
  // Call your error event function
  const errorEvent = require('./events/error')
  errorEvent(error)
})

client.on('messageCreate', async (message) => {
  // Handle counting messages
  handleCountingMessage(message)
})

// Export the client object
module.exports = client

// Start the bot only if this file is being run directly
if (require.main === module) {
  client.login(token)
}
