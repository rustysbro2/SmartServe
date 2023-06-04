const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const { clientId, token, guildId } = require('./config.js');

const rest = new REST({ version: '10' }).setToken(token);

const fetchCommands = async () => {
  try {
    const globalCommands = await rest.get(
      Routes.applicationCommands(clientId)
    );
    console.log('Global Commands:');
    console.log(globalCommands);

    console.log('Global Command Options:');
    for (const command of globalCommands) {
      const commandDetails = await rest.get(
        Routes.applicationCommand(clientId, command.id)
      );
      console.log('Command:', command.name);
      console.log('Options:', commandDetails.options);
    }
  } catch (error) {
    console.log(`There was an error: ${error}`);
  }
};

fetchCommands();
