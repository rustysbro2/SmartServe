const { Client, Collection, Intents, ShardingManager } = require('discord.js');
const { token } = require('./config.js');
const inviteTracker = require('./features/inviteTracker.js');
const fs = require('fs');

const intents = new Intents([
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_VOICE_STATES,
]);

const manager = new ShardingManager('./bot.js', { token: token });

manager.on('shardCreate', async shard => {
    console.log(`Launched shard ${shard.id}`);
    await shard.whenReady;

    const client = shard.client;

    client.commands = new Collection();

    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        client.commands.set(command.data.name, command);
    }

    client.once('ready', async () => {
        console.log(`Shard ${shard.id} logged in as ${client.user.tag}!`);
        client.user.setActivity(`${client.guilds.cache.size} servers | Shard ${shard.id}`, { type: 'WATCHING' });

        inviteTracker.execute(client);

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

    client.on('voiceStateUpdate', async (oldState, newState) => {
        if (!oldState.channelId) return;
        const botInOldChannel = oldState.channel.members.has(client.user.id);
        if (!botInOldChannel) return;

        if (oldState.channelId !== newState.channelId) {
            const playCommand = client.commands.get('play');
            if (playCommand) {
                await playCommand.execute(oldState, client);
            }
        }
    });

    await client.login(token);
});

manager.spawn();
