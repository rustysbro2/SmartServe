const { Client, Intents } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.on('ready', () => {
  console.log(`Bot is online: ${client.user.tag}`);
  
  const guildId = 'YOUR_GUILD_ID'; // Replace with your guild ID
  const commands = [
    new SlashCommandBuilder().setName('hello').setDescription('Says hello!'),
  ];

  client.guilds.cache.get(guildId).commands.set(commands).then(() => {
    console.log('Slash commands registered.');
  }).catch(console.error);
});

client.on('interactionCreate', (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'hello') {
    interaction.reply('Hello!');
  }
});

client.login('YOUR_BOT_TOKEN');

const { Client, Intents } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.on('ready', () => {
  console.log(`Bot is online: ${client.user.tag}`);
  
  const guildId = 'YOUR_GUILD_ID'; // Replace with your guild ID
  const commands = [
    new SlashCommandBuilder().setName('hello').setDescription('Says hello!'),
  ];

  client.guilds.cache.get(guildId).commands.set(commands).then(() => {
    console.log('Slash commands registered.');
  }).catch(console.error);
});

client.on('interactionCreate', (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'hello') {
    interaction.reply('Hello!');
  }
});

client.login('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY');
