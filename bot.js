// Import the Discord client
const { Client } = require('@discordjs/rest');

const { Intents } = require('discord.js');

// Import the bot's token
const { token } = require('./config.js');

// Import the invite tracker
const inviteTracker = require('./features/inviteTracker.js');

// Import the file system
const fs = require('fs');

// Import the voice functionality
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

// Import the audio functionality
const { AudioPlayerStatus, createAudioPlayer, createAudioResource } = require('@discordjs/voice');

// Import the YouTube download library
const ytdl = require('ytdl-core');

// Create a new Discord client
const client = new Client({ shards: 3, intents });

// Create a new collection to store commands
client.commands = new Collection();

// Create a new map to store music players
client.musicPlayers = new Map();

// Get all of the command files
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// For each command file
for (const file of commandFiles) {

  // Import the command
  const command = require(`./commands/${file}`);

  // Add the command to the collection
  client.commands.set(command.data.name, command);
}

// Add an event listener for the `ready` event
client.on('ready', async () => {

  // Log the bot's ID and the number of guilds it is in
  console.log(`Shard ${client.shard.ids} logged in as ${client.user.tag} | ${client.guilds.cache.size} servers`);

  // Set the bot's status
  client.user.setActivity('Playing with Discord.js');

  // Import the slash commands
  const slashCommands = require('./slashCommands.js');
  await slashCommands(client);

  // Start checking voice channels every second
  setInterval(() => {
    checkVoiceChannels();
  }, 1000); // Check every 1 second
});

async function checkVoiceChannels() {
  const botId = client.user.id;
  const guilds = client.guilds.cache;

  for (const guild of guilds) {
    const guildId = guild[1].id;
    const musicPlayer = client.musicPlayers.get(guildId);
    const voiceChannels = guild[1].channels.cache.filter(channel => channel.type === 'GUILD_VOICE');

    for (const [channelId, channel] of voiceChannels) {
      if (channel.members.size === 1 && channel.members.has(botId)) {
        // Bot is the only member in the voice channel
        console.log(`Bot is the only member in the voice channel: ${channel.name}`);
        console.log(`Channel Members: ${channel.members.size}`);
        
        if (musicPlayer && musicPlayer.connection) {
          console.log("Destroying connection and leaving voice channel.");
          musicPlayer.connection.destroy();
          client.musicPlayers.delete(guildId);
        }
      }
    }
  }
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction, client); // Execute the command
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});
