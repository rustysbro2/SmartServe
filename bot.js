const { InteractionType } = require('discord.js');
// bot.js
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.js');
const inviteTracker = require('./features/inviteTracker.js');
const fs = require('fs');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const { AudioPlayerStatus, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const ytdl = require('ytdl-core');


const client = new client({
    intents: [
        GatewayIntentBits.GUILDS,
        GatewayIntentBits.GUILD_MESSAGES,
        GatewayIntentBits.GUILD_MEMBERS,
        GatewayIntentBits.GUILD_VOICE_STATES,
    ],
});



const {ShardingManager } = require('discord.js');

client = new Client({
  shards: 10,
});

const manager = new ShardingManager(client);

manager.createShards();

manager.assignDocumentsToShards();

manager.queryShards();

client.commands = new Collection();
client.musicPlayers = new Map();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once('ready', async () => {
  console.log(`Shard ${client.shard.ids} logged in as ${client.user.tag}!`);
  client.user.setActivity(`${client.guilds.cache.size} servers | Shard ${client.shard.ids[0]}`, { type: 'WATCHING' });

  inviteTracker.execute(client);

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
  if (!interaction.type === InteractionType.ApplicationCommand) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction, client); // Execute the command
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

client.login(token);
