// bot.js
const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.js');

// List intents that the bot needs access to
const intents = new Intents([
    Intents.FLAGS.GUILDS, 
    Intents.FLAGS.GUILD_MESSAGES,
    // Add other intents here based on the needs of your bot
]);

const client = new Client({ shards: "auto", intents });

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

client.on('ready', () => {
    console.log(`Shard ${client.shard.ids} logged in as ${client.user.tag}!`);
});

// Add your event handlers and other code here

client.login(token);
