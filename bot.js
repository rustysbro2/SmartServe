// bot.js
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.js');
const inviteTracker = require('./features/inviteTracker.js');
const MusicPlayer = require('./features/musicPlayer.js');  // Importing MusicPlayer
const fs = require('fs');

// List intents that the bot needs access to
const intents = new Intents([
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_VOICE_STATES,
]);

const client = new Client({ shards: "auto", intents });

// Create a new Collection for commands
client.commands = new Collection();

// Create a new Collection for music players, storing them by voice channel ID
client.musicPlayers = new Collection();  

// Dynamically retrieve commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.once('ready', async () => {
    console.log(`Shard ${client.shard.ids} logged in as ${client.user.tag}!`);
    client.user.setActivity(`${client.guilds.cache.size} servers | Shard ${client.shard.ids[0]}`, { type: 'WATCHING' });

    // Start the invite tracker
    inviteTracker.execute(client);

    // Start the command registration process after bot is ready
    const slashCommands = require('./slashCommands.js');
    await slashCommands(client);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

client.login(token);