const { Client, Intents, Collection } = require('discord.js');
const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { token, clientId } = require('./config');
const { trackUserJoin, setTrackingChannel } = require('./TrackingLogic');

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_INVITES],
});

// Create a collection to store the commands
client.commands = new Collection();

// Read the command files from the 'commands' folder
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// Load each command dynamically and add it to the collection
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Event triggered when the bot is ready
client.once('ready', async () => {
  console.log('Logged in as', client.user.tag);

  // Register the slash commands
  const rest = new REST({ version: '9' }).setToken(token);
  try {
    console.log('Started refreshing application (/) commands.');

    // Convert the command collection to an array of command data
    const commands = client.commands.map(command => command.data.toJSON());

    // Register the commands globally
    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

// Event triggered when an interaction (slash command) is created
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const commandName = interaction.commandName;
  const command = client.commands.get(commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply('An error occurred while executing the command.');
  }
});

// Event triggered when a user joins a guild
client.on('guildMemberAdd', member => {
  trackUserJoin(member.guild.id, member);
});

// Login the bot using the token
client.login(token);
