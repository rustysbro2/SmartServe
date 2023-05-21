const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const tracemalloc = require('tracemalloc');
const random = require('random');
const { Giveaway } = require('./giveaway');
const { Tracking } = require('./tracking');
const { MusicBot } = require('./musicbot');
const interactions = require('./interactions');

tracemalloc.start();

const bot = new Discord.Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });
const commands = new Discord.Collection();
const checkMarkEmojis = ['✅', '☑️', '✔️'];
const trophyEmojis = ['🏆', '🥇', '🥈', '🥉'];

// File paths
const dataFile = 'count_data.json';
const helpDataFile = 'help_data.json';

// Default data values
const defaultData = {
  channel_id: null,
  count: 0,
  last_counter_id: null,
  high_score: 0,
  increment: 1,
  pending_increment: null,
  old_increment: 1,
  successful_counts: 0
};

// Add your extension names here
const extensions = ['musicbot', 'giveaway', 'tracking'];

function ensureDataFileExists() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '{}');
  }
}

bot.on('ready', async () => {
  console.log(`We have logged in as ${bot.user.tag}`);
  await bot.user.setActivity('with commands');

  bot.commands = new Discord.Collection();
  await addExtensions();

  console.log('Extensions loaded successfully.');
});

async function addExtensions() {
  const extensionPromises = extensions.map(async (extension) => {
    const Extension = require(`./${extension}`);
    const ext = new Extension(bot);
    await ext.init();
    bot.commands.set(ext.name, ext.commands);
  });

  await Promise.all(extensionPromises);
}

async function generateHelpData(helpDataFile) {
  console.log('Generating help data...');
  const helpData = {
    Counting: {},
    Giveaway: {},
    MusicBot: {},
    Tracking: {}
  };

  const generalCommands = [];

  for (const extension of extensions) {
    const ext = bot.commands.get(extension);
    console.log(`Extension: ${extension}, Cog: ${ext}`);
    if (ext) {
      for (const command of ext.commands) {
        if (!command.hidden) {
          const usage = getCommandUsage(command);
          const example = generateCommandExample(command);
          helpData[extension][command.name] = { usage, example };
        } else {
          generalCommands.push(command);
        }
      }
    } else {
      for (const command of bot.commands.values()) {
        if (!command.hidden) {
          const usage = getCommandUsage(command);
          const example = generateCommandExample(command);
          generalCommands.push(command);
        }
      }
    }
  }

  helpData.Counting = generalCommands.reduce((commandsData, command) => {
    commandsData[command.name] = { usage: getCommandUsage(command), example: generateCommandExample(command) };
    return commandsData;
  }, {});

  try {
    fs.writeFileSync(helpDataFile, JSON.stringify(helpData, null, 4));

    console.log('Help data generated successfully.');
  } catch (error) {
    console.error(`Error generating help data: ${error}`);
  }

  // Debug lines to verify file path, existence, and size
  console.log(`Current working directory: ${process.cwd()}`);
  console.log(`File exists: ${fs.existsSync(helpDataFile)}`);
  console.log(`File size: ${fs.statSync(helpDataFile).size} bytes`);
}

function generateCommandExample(command) {
  const parameters = command.execute.toString().match(/\(([^)]*)/)[1].split(',').map((param) => param.trim());
  const args = parameters.filter((param) => param !== 'message').map((param) => {
    const paramName = param.split(':')[0];
    const paramDefault = param.split('=')[1];
    if (paramDefault) {
      return `[${paramName}=${paramDefault}]`;
    } else {
      return `<${paramName}>`;
    }
  });

  const example = `!${command.name} ${args.join(' ')}`;
  return example;
}

bot.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  ensureDataFileExists();

  const data = getDataForGuild(message.guild.id);
  if (!data) return;

  if (message.channel.id === data.channel_id) {
    let failReason = '';
    let incrementChanged = false;

    try {
      const number = parseInt(message.content);
      const expectedNumber = data.count + data.increment;
      if (number === expectedNumber) {
        if (message.author.id !== data.last_counter_id) {
          data.count += data.increment;
          data.last_counter_id = message.author.id;
          data.successful_counts++;
          console.log(`Message: ${message.content}`); // Log the message content
          console.log(`Current count: ${data.count}`); // Log the current count
          console.log(`Current increment: ${data.increment}`); // Log the current increment
          console.log(`Successful counts: ${data.successful_counts}`); // Log the successful counts
          if (data.successful_counts > data.high_score) {
            // Compare successful counts to high score
            data.high_score = data.successful_counts; // Update high score based on successful counts
            console.log(`New high score: ${data.high_score}`); // Log the new high score
            const randomTrophy = random.arrayElement(trophyEmojis);
            await message.react(randomTrophy);
          } else {
            const randomCheckMark = random.arrayElement(checkMarkEmojis);
            await message.react(randomCheckMark);
          }

          // Save the updated data to the JSON file
          setDataForGuild(message.guild.id, data);
        } else {
          failReason = "You can't count two numbers in a row. Let others participate!";
        }
      } else {
        failReason = 'The number doesn\'t follow the counting sequence.';
      }
    } catch (error) {
      failReason = 'The text you entered is not a valid mathematical expression.';
    }

    if (failReason) {
      console.log('Fail reason:', failReason);
      await message.react('❌');
      await message.delete();
      const expectedNumber = data.count + data.increment; // Calculate the expected number

      // Reset the count and last counter ID
      data.count = 0;
      data.last_counter_id = null;
      data.successful_counts = 0; // Reset successful counts
      if (data.pending_increment !== null) {
        // If there's a pending increment
        data.old_increment = data.increment; // Save the old increment
        data.increment = data.pending_increment; // Apply the pending increment
        incrementChanged = true; // Set incrementChanged to true if there's a pending increment
        data.pending_increment = null; // Reset the pending increment
      }
      console.log('New game started');

      setDataForGuild(message.guild.id, data);

      // Check if a new counting channel should be created
      const oldChannelId = data.channel_id;
      const oldChannel = bot.channels.cache.get(oldChannelId);
      const newChannel = await oldChannel.clone({ name: oldChannel.name });
      data.channel_id = newChannel.id;
      await oldChannel.delete();

      // Update the data file with the new channel ID
      setDataForGuild(message.guild.id, data);

      // Create embed
      const embed = new Discord.MessageEmbed()
        .setTitle('Counting Failure')
        .setDescription(`**Failure Reason:** ${failReason}\n` +
          `**You typed:** ${message.content}\n` +
          `**Failed by:** ${message.author}\n` +
          `**Expected Number:** ${expectedNumber}`)
        .setColor('#FF0000');
      if (incrementChanged) {
        // If the increment has changed
        embed.addField('**Increment Changed**',
          `The increment has changed from ${data.old_increment} ➡️ ${data.increment}.`);
      }

      // Send the embed
      await newChannel.send({ embeds: [embed] });

      // Ping the user and then delete the message
      const pingMsg = await newChannel.send({ content: message.author.toString() });
      await pingMsg.delete();
    }
  }
});

function getCommandUsage(command) {
  const commandSignature = `!${command.name}`;
  const parameters = command.execute.toString().match(/\(([^)]*)/)[1].split(',').map((param) => param.trim());
  const paramsStr = parameters.filter((param) => !['message', 'client'].includes(param.split(':')[0])).map((param) => {
    const paramName = param.split(':')[0];
    const paramDefault = param.split('=')[1];
    if (paramDefault) {
      return `[${paramName}=${paramDefault}]`;
    } else {
      return `<${paramName}>`;
    }
  });

  const usage = paramsStr.join(' ');
  return `${commandSignature} ${usage}`;
}

function getDataForGuild(guildId) {
  ensureDataFileExists();

  const rawData = fs.readFileSync(dataFile);
  const allData = JSON.parse(rawData);

  const guildData = allData[guildId];
  if (!guildData) return null;

  return guildData;
}

function setDataForGuild(guildId, newData) {
  ensureDataFileExists();

  const rawData = fs.readFileSync(dataFile);
  const allData = JSON.parse(rawData);

  allData[guildId] = newData;

  fs.writeFileSync(dataFile, JSON.stringify(allData, null, 4));
}

bot.login('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY');
