const discord = require('discord.js');
const { Client, Intents } = require('discord.js');
const fs = require('fs');
const { promisify } = require('util');
const tracemalloc = require('tracemalloc');
const random = require('random');
const giveaway = require('./giveaway');
const tracking = require('./tracking');
const musicbot = require('./musicbot');

tracemalloc.start();

const intents = new Intents();
intents.ALL = true;

const bot = new Client({ intents: intents });
bot.commands = new discord.Collection();

const dataFile = 'count_data.json';
const helpDataFile = 'help_data.json';

const defaultData = {
  channel_id: null,
  count: 0,
  last_counter_id: null,
  high_score: 0,
  increment: 1,
  pending_increment: null,
  old_increment: 1,
  successful_counts: 0,
};

const extensions = ['musicbot', 'giveaway', 'tracking'];

const checkMarkEmojis = ['✅', '☑️', '✔️'];
const trophyEmojis = ['🏆', '🥇', '🥈', '🥉'];

function ensureDataFileExists() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '{}', 'utf8');
  }
}

bot.on('ready', async () => {
  console.log(`We have logged in as ${bot.user.tag}`);
  await bot.user.setActivity('with commands');

  await bot.commands.set('giveaway', giveaway);
  await bot.commands.set('tracking', tracking);
  await bot.commands.set('musicbot', musicbot);
});

async function generateHelpData(helpDataFile) {
  console.log('Generating help data...');
  const helpData = {
    Counting: {},
    Giveaway: {},
    MusicBot: {},
    Tracking: {},
  };

  const generalCommands = [];

  for (const extension of extensions) {
    const ext = bot.commands.get(extension);
    console.log(`Extension: ${extension}, Cog: ${ext}`);
    if (ext) {
      for (const command of ext.getCommands()) {
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

  helpData.Counting = generalCommands.reduce((commands, command) => {
    commands[command.name] = { usage: getCommandUsage(command), example: generateCommandExample(command) };
    return commands;
  }, {});

  try {
    await promisify(fs.writeFile)(helpDataFile, JSON.stringify(helpData, null, 4));
    console.log('Help data generated successfully.');
  } catch (error) {
    console.log(`Error generating help data: ${error}`);
  }

  console.log(`Current working directory: ${process.cwd()}`);
  console.log(`File exists: ${fs.existsSync(helpDataFile)}`);
  console.log(`File size: ${fs.statSync(helpDataFile).size} bytes`);
}

function generateCommandExample(command) {
  const params = command.callback.length > 0 ? command.callback.toString().match(/\((.*?)\)/)[1].split(/\s*,\s*/) : [];
  const args = params
    .filter((param) => !['self', 'ctx'].includes(param))
    .map((param) => {
      const [name, defaultValue] = param.split('=').map((part) => part.trim());
      return defaultValue ? `[${name}=${defaultValue}]` : `<${name}>`;
    });

  const example = `!${command.name} ${args.join(' ')}`;
  return example;
}

bot.on('message', async (message) => {
  if (message.author.bot) return;

  ensureDataFileExists();

  const allData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const data = allData[message.guild.id];

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
          data.successful_counts += 1;
          console.log(`Message: ${message.content}`);
          console.log(`Current count: ${data.count}`);
          console.log(`Current increment: ${data.increment}`);
          console.log(`Successful counts: ${data.successful_counts}`);
          if (data.successful_counts > data.high_score) {
            data.high_score = data.successful_counts;
            console.log(`New high score: ${data.high_score}`);
            const randomTrophy = random.choice(trophyEmojis);
            await message.react(randomTrophy);
          } else {
            const randomCheckMark = random.choice(checkMarkEmojis);
            await message.react(randomCheckMark);
          }

          allData[message.guild.id] = data;
          await promisify(fs.writeFile)(dataFile, JSON.stringify(allData, null, 4));
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
      const expectedNumber = data.count + data.increment;

      data.count = 0;
      data.last_counter_id = null;
      data.successful_counts = 0;
      if (data.pending_increment !== null) {
        data.old_increment = data.increment;
        data.increment = data.pending_increment;
        incrementChanged = true;
        data.pending_increment = null;
      }

      console.log('New game started');
      allData[message.guild.id] = data;
      await promisify(fs.writeFile)(dataFile, JSON.stringify(allData, null, 4));

      const oldChannelId = data.channel_id;
      const oldChannel = bot.channels.cache.get(oldChannelId);
      const newChannel = await oldChannel.clone();
      data.channel_id = newChannel.id;

      await oldChannel.delete();

      await promisify(fs.writeFile)(dataFile, JSON.stringify(allData, null, 4));

      const embed = new discord.MessageEmbed()
        .setTitle('Counting Failure')
        .setDescription(
          `**Failure Reason:** ${failReason}\n` +
          `**You typed:** ${message.content}\n` +
          `**Failed by:** ${message.author}\n` +
          `**Expected Number:** ${expectedNumber}`
        )
        .setColor('RED');

      if (incrementChanged) {
        embed.addField('**Increment Changed**', `The increment has changed from ${data.old_increment} ➡️ ${data.increment}.`);
      }

      await newChannel.send(embed);

      const pingMsg = await newChannel.send(message.author.toString());
      await pingMsg.delete();
    }
  }
});


bot.login('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY');
