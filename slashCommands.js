const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, token } = require('./config.js');
const fs = require('fs');

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        const commands = await rest.get(Routes.applicationCommands(clientId));
        const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
        const commandsInCode = commandFiles.map(file => require(`./commands/${file}`).data.name);

        for (const command of commands) {
            if (!commandsInCode.includes(command.name)) {
                await rest.delete(Routes.applicationCommand(clientId, command.id));
            }
        }
    } catch (error) {
        console.error(error);
    }
})();
