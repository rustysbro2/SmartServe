const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const { clientId, token, guildId } = require('./config.js');

const rest = new REST({ version: '10' }).setToken(token);

const fetchCommands = async () => {
  try {
    const guildCommands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    console.log('Guild Commands:');
    console.log(guildCommands);

    const globalCommands = await rest.get(
      Routes.applicationCommands(clientId)
    );
    console.log('Global Commands:');
    console.log(globalCommands);
  } catch (error) {
    console.log(`There was an error: ${error}`);
  }
};

fetchCommands();
