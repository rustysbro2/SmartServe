const { Client, Intents } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

const token = '1105598736551387247'; 
const clientId = '1105598736551387247'; // Replace with your bot's client ID
const guildId = '1100765844776173670'; // Replace with your guild ID

const commands = [
  {
    name: 'hello',
    description: 'Says hello!'
  }
];

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.once('ready', async () => {
  console.log(`Bot is online: ${client.user.tag}`);

  try {
    const rest = new REST({ version: '10' }).setToken(token);

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log('Slash commands registered.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'hello') {
    await interaction.reply('Hello!');
  }
});

client.login(token);

