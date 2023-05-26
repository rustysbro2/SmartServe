// slashCommands.js
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token } = require('./config.js');
const fs = require('fs');

function commandHasChanged(oldCommand, newCommand) {
    return oldCommand.name !== newCommand.name ||
        oldCommand.description !== newCommand.description ||
        (oldCommand.options && newCommand.options && 
        JSON.stringify(oldCommand.options) !== JSON.stringify(newCommand.options));
}

module.exports = async function(client) {
    const commands = [];
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        commands.push(command.data);
    }

    const rest = new REST({ version: '10' }).setToken(token);

    // Loop through each guild the bot is in and register the slash commands
    client.guilds.cache.forEach(async (guild) => {
        try {
            console.log(`Started refreshing application (/) commands for guild ${guild.id}.`);

            // Get existing slash commands in the guild
            const existingCommands = await rest.get(
                Routes.applicationGuildCommands(clientId, guild.id)
            );

            // Remove old commands and update changed commands
            for (const command of existingCommands) {
                const newCommand = commands.find(cmd => cmd.name === command.name);
                if (!newCommand) {
                    await rest.delete(
                        Routes.applicationGuildCommand(clientId, guild.id, command.id)
                    );
                } else if (commandHasChanged(command, newCommand)) {
                    await rest.patch(
                        Routes.applicationGuildCommand(clientId, guild.id, command.id),
                        { body: newCommand }
                    );
                }
            }

            // Add new commands
            for (const command of commands) {
                if (!existingCommands.find(cmd => cmd.name === command.name)) {
                    await rest.post(
                        Routes.applicationGuildCommands(clientId, guild.id),
                        { body: command },
                    );
                }
            }

            console.log(`Successfully reloaded application (/) commands for guild ${guild.id}.`);
        } catch (error) {
            console.error(`Error while refreshing application (/) commands for guild ${guild.id}.`, error);
        }
    });
};
