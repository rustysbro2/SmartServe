const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.js');
const inviteTracker = require('./features/inviteTracker.js');
const fs = require('fs');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const { AudioPlayerStatus, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { handleSelectMenu } = require('./commands/help');

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildVoiceStates
];

const client = new Client({ shards: "auto", intents });

client.commands = new Collection();
client.musicPlayers = new Map();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commandCategories = [];

for (const file of commandFiles) {
  const command = require(`./commands/${file.endsWith('.js') ? file : file + '.js'}`);
  client.commands.set(command.data.name, command);

  if (command.category) {
    let category = commandCategories.find(category => category.name === command.category);
    if (!category) {
      category = {
        name: command.category,
        description: '',
        commands: []
      };
      commandCategories.push(category);
    }
    category.commands.push({
      name: command.data.name,
      description: command.data.description
    });
  } else {
    let defaultCategory = commandCategories.find(category => category.name === 'Uncategorized');
    if (!defaultCategory) {
      defaultCategory = {
        name: 'Uncategorized',
        description: 'Commands that do not belong to any specific category',
        commands: []
      };
      commandCategories.push(defaultCategory);
    }
    defaultCategory.commands.push({
      name: command.data.name,
      description: command.data.description
    });
  }
}

client.once('ready', async () => {
  console.log(`Shard ${client.shard.ids} logged in as ${client.user.tag}!`);
  client.user.setActivity(`${client.guilds.cache.size} servers | Shard ${client.shard.ids[0]}`, { type: 'WATCHING' });

  inviteTracker.execute(client);

  const slashCommands = require('./slashCommands.js');
  await slashCommands(client);

  // Start checking voice channels every second
  setInterval(() => {
    checkVoiceChannels();
  }, 1000); // Check every 1 second
});

async function checkVoiceChannels() {
  const botId = client.user.id;
  const guilds = client.guilds.cache;

  console.log(`Checking voice channels at ${new Date().toLocaleTimeString()}`);

  for (const [guildId, guild] of guilds) {
    const musicPlayer = client.musicPlayers.get(guildId);
    const voiceChannels = guild.channels.cache.filter(channel => channel.type === 'GUILD_VOICE');

    console.log(`Guild: ${guildId}, Voice Channels: ${voiceChannels.size}`);

    for (const [channelId, channel] of voiceChannels) {
      const members = channel.members.filter(member => !member.user.bot);

      console.log(`Channel: ${channelId}, Members: ${members.size}, Member IDs: ${members.map(member => member.id).join(', ')}`);

      if (members.size === 0 && channel.members.has(botId)) {
        // Bot is the only member in the voice channel
        console.log(`Bot is the only member in the voice channel: ${channel.name}`);

        if (musicPlayer && musicPlayer.connection) {
          console.log("Destroying connection and leaving voice channel.");
          musicPlayer.connection.destroy();
          client.musicPlayers.delete(guildId);
        }
      }
    }
  }
}

client.on('interactionCreate', async (interaction) => {
  console.log('Interaction received:', interaction);

  if (interaction.isStringSelectMenu() && interaction.customId === 'help_category') {
    console.log('Select menu interaction received:', interaction);
    await handleSelectMenu(interaction, commandCategories);
  } else if (interaction.isCommand()) {
    const { commandName } = interaction;

    console.log('Command interaction received:', interaction);

    if (commandName === 'help') {
      console.log('Executing help command...');
      await client.commands.get('help').execute(interaction, client);
      console.log('Help command executed.');
    } else {
      const command = client.commands.get(commandName);

      if (!command) return;

      try {
        console.log(`Executing ${commandName} command...`);
        await command.execute(interaction, client);
        console.log(`${commandName} command executed.`);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    }
  }
});

client.login(token);
