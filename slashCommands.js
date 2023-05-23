// slashCommands.js
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, token } = require('./config.js');
const fs = require('fs');

module.exports = async function(client) {
    const commands = [];
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '9' }).setToken(token);

    // Loop through each guild the bot is in and register the slash commands
    client.guilds.cache.each(async (guild) => {
        try {
            console.log(`Started refreshing application (/) commands for guild ${guild.id}.`);

            // Remove all slash commands in the guild
            const existingCommands = await rest.get(
                Routes.applicationGuildCommands(clientId, guild.id)
            );

            for (const command of existingCommands) {
                if (!commands.find(cmd => cmd.name === command.name)) {
                    await rest.delete(
                        Routes.applicationGuildCommand(clientId, guild.id, command.id)
                    );
                }
            }

            // Register the new slash commands
            await rest.put(
                Routes.applicationGuildCommands(clientId, guild.id),
                { body: commands },
            );

            console.log(`Successfully reloaded application (/) commands for guild ${guild.id}.`);
        } catch (error) {
            console.error(`Error while refreshing application (/) commands for guild ${guild.id}.`, error);
        }
    });
};
