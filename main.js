const { Client, Intents } = require('discord.js');
const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { token, clientId } = require('./config');
const { trackUserJoin, setTrackingChannel, trackingCommands } = require('./commands/tracking');

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_INVITES],
});

const commands = trackingCommands.map(command => command.data.toJSON());
trackingCommands.forEach(command => {
  const { execute } = command;
  client.on('interactionCreate', execute);
});

// Function to handle user join event
client.on('guildMemberAdd', (member) => {
  // Track the user join event
  trackUserJoin(member.guild.id, member);
});

// Event triggered when the bot is ready
client.once('ready', async () => {
  console.log('Logged in as', client.user.tag);

  // Register the slash commands
  const rest = new REST({ version: '9' }).setToken(token);
  try {
    console.log('Started refreshing application (/) commands.');

    // Register the commands globally
    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

// Login the bot using the token
client.login(token);
