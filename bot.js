const { Client, Collection, GatewayIntentBits, Presence, ActivityType } = require('discord.js');
const { token, guildId } = require('./config.js');
const inviteTracker = require('./features/inviteTracker.js');
const fs = require('fs');
const helpCommand = require('./commands/help');
const countingCommand = require('./commands/count');
const slashCommands = require('./slashCommands.js');
const { logStrike, createStrikeTables  } = require('./features/strikeFeature.js');
createStrikeTables();

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildPresences
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
        commands: [],
        guildId: command.guildId,
        categoryDescription: command.categoryDescription
      };
      commandCategories.push(category);
    }
    category.commands.push({
      name: command.data.name,
      description: command.data.description,
      global: command.global !== false,
      categoryDescription: command.categoryDescription
    });
  } else {
    let defaultCategory = commandCategories.find(category => category.name === 'Uncategorized');
    if (!defaultCategory) {
      defaultCategory = {
        name: 'Uncategorized',
        description: 'Commands that do not belong to any specific category',
        commands: [],
        guildId: undefined
      };
      commandCategories.push(defaultCategory);
    }
    defaultCategory.commands.push({
      name: command.data.name,
      description: command.data.description,
      global: command.global !== false
    });
  }
}

commandCategories.forEach((category) => {
  if (category.commands.length === 0) {
    const index = commandCategories.indexOf(category);
    commandCategories.splice(index, 1);
  }
});

client.once('ready', async () => {
  try {
    console.log(`Shard ${client.shard.ids} logged in as ${client.user.tag}!`);
    client.user.setPresence({
      activities: [
        {
          name: `${client.guilds.cache.size} servers | Shard ${client.shard.ids[0]}`,
          type: ActivityType.WATCHING,
        },
      ],
      status: "online",
    });

    inviteTracker.execute(client);

    await slashCommands(client);

    console.log('Command Categories:');
    commandCategories.forEach((category) => {
      console.log(`Category: ${category.name}`);
      console.log(`Guild ID: ${category.guildId}`);
      console.log('Commands:', category.commands);
    });
  } catch (error) {
    console.error('Error during bot initialization:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'help_category') {
      helpCommand.handleSelectMenu(interaction, commandCategories, guildId);
    } else if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) {
        const guild = interaction.guild;
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        if (guild && user && reason) {
          await command.execute(interaction, client, commandCategories, guildId);

          // Log the strike after executing the command
          await logStrike(guild.id, user.id, reason, client);
        } else {
          console.log('Missing required information to log a strike.');
          console.log('Guild:', guild);
          console.log('User:', user);
          console.log('Reason:', reason);
        }
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
  }
});


client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.login(token);
