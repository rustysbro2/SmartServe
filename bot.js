const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token, guildId } = require('./config.js');
const inviteTracker = require('./features/inviteTracker.js');
const fs = require('fs');
const helpCommand = require('./commands/help');

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
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'help_category') {
    await helpCommand.handleSelectMenu(interaction, commandCategories);
  } else if (interaction.isCommand()) {
    const { commandName, guildId: interactionGuildId } = interaction;

    if (commandName === 'help') {
      await client.commands.get('help').execute(interaction, client, commandCategories, interaction.guildId);
    } else {
      const command = client.commands.get(commandName);

      if (!command) return;

      const isGlobal = !interactionGuildId || (interactionGuildId === guildId);

      if (isGlobal && !command.global) {
        await interaction.reply({ content: 'This command is not available globally!', ephemeral: true });
        return;
      }

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    }
  }
});



client.login(token);
