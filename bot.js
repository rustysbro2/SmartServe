const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.js');
const inviteTracker = require('./features/inviteTracker.js');
const fs = require('fs');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const { AudioPlayerStatus, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

const intents = new Intents([
  Intents.FLAGS.GUILDS,
  Intents.FLAGS.GUILD_MESSAGES,
  Intents.FLAGS.GUILD_MEMBERS,
  Intents.FLAGS.GUILD_VOICE_STATES,
]);

const client = new Client({ shards: "auto", intents });

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
});

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

client.on('presenceUpdate', async (oldPresence, newPresence) => {
  const botId = client.user.id;
  const guildId = newPresence.guild.id;
  const musicPlayer = client.musicPlayers.get(guildId);

  if (musicPlayer && musicPlayer.connection) {
    const botInChannel = oldPresence?.activities.some(activity => activity.type === 'PLAYING' && activity.partyID === botId);
    const botAlone = newPresence.activities.some(activity => activity.type === 'PLAYING' && activity.partyID === botId && newPresence.guild.channels.cache.get(activity?.details)?.members.size === 1);

    if (botInChannel && !botAlone) {
      console.log(`Other users joined the voice channel: ${newPresence.guild.channels.cache.get(newPresence.activities[0]?.details).name}`);
      console.log(`Channel Members: ${newPresence.guild.channels.cache.get(newPresence.activities[0]?.details).members.size}`);
    }

    if (botInChannel && botAlone) {
      console.log(`Bot is the only member in the voice channel: ${newPresence.guild.channels.cache.get(newPresence.activities[0]?.details).name}`);
      console.log(`Channel Members: ${newPresence.guild.channels.cache.get(newPresence.activities[0]?.details).members.size}`);
      console.log("Destroying connection and leaving voice channel.");
      musicPlayer.connection.destroy();
      client.musicPlayers.delete(guildId);
    }
  }
});








client.login(token);
