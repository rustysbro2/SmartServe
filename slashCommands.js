// slashCommands.js
const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, token } = require('./config.json');

module.exports = async (client) => {
    const commands = [];
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '9' }).setToken(token);

    // Loop through all guilds the bot is connected to
    for (const guild of client.guilds.cache.values()) {
        try {
            console.log(`Started refreshing application (/) commands in guild ${guild.id}`);

            const existingCommands = await rest.get(Routes.applicationGuildCommands(clientId, guild.id));

            for (const command of existingCommands) {
                const commandExists = commands.find(cmd => cmd.name === command.name);
                if (!commandExists) {
                    await rest.delete(Routes.applicationGuildCommand(clientId, guild.id, command.id));
                }
            }

            await rest.put(
                Routes.applicationGuildCommands(clientId, guild.id),
                { body: commands },
            );

            console.log(`Successfully reloaded application (/) commands in guild ${guild.id}`);
        } catch (error) {
            console.error(error);
        }
    }
};
