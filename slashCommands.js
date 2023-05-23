const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.json');

const commandsInCode = new Set(fs.readdirSync('./commands').map(file => file.slice(0, -3)));

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    const registeredCommands = await rest.get(
        Routes.applicationGuildCommands(clientId, guildId),
    );

    for (const command of registeredCommands) {
        if (!commandsInCode.has(command.name)) {
            console.log(`Deleting command: ${command.name}`);
            await rest.delete(
                Routes.applicationGuildCommand(clientId, guildId, command.id),
            );
        }
    }
})();
