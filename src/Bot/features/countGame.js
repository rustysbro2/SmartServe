const { pool } = require('../../database.js'); // Importing the database connection pool
const { EmbedBuilder } = require('discord.js'); // Importing the EmbedBuilder from the 'discord.js' library
const math = require('mathjs'); // Importing the 'mathjs' library

const countingChannels = {}; // Object to store counting channel details for each guild

async function setCountingChannel(guildId, channelId) {
  countingChannels[guildId] = {
    countingChannelId: channelId,
    guildId: guildId,
    currentCount: 0,
    previousCount: 0,
    lastUserCount: null,
    gameFailed: false,
    highScore: 0,
    incrementValue: 1,
    totalNumbersCounted: 0, // Initialize totalNumbersCounted to 0
  };

  try {
    countingChannels[guildId].countingChannelId = channelId;
    console.log('Counting channel ID updated in countingChannels object:', countingChannels[guildId].countingChannelId);

    await updateCountingChannel(guildId); // Update the counting channel in the database
    console.log('Counting channel set:', channelId);
  } catch (error) {
    console.error('Error setting counting channel:', error);
  }
}


// Function to load the counting channels from the database
async function loadCountingChannels() {
  try {
    const results = await getCountingChannelsFromDB();
    if (results) {
      results.forEach((result) => {
        const guildId = result.guild_id;
        countingChannels[guildId] = assignCountingChannelValues(result);
        console.log('Counting channel loaded:', countingChannels[guildId].countingChannelId);
      });
    }
  } catch (error) {
    console.error('Error loading counting channels:', error);
  }
}

// Function to get the counting channel ID for a guild
function getCountingChannelId(guildId) {
  const countingChannel = countingChannels[guildId];
  return countingChannel ? countingChannel.countingChannelId : null;
}

// Function to handle counting messages
async function handleCountingMessage(message) {
  const { channelId, content, author, client, guild } = message;
  const guildId = guild.id;

  const countingChannel = countingChannels[guildId];
  if (!countingChannel || channelId !== countingChannel.countingChannelId) {
    return; // Ignore messages from other channels or guilds without a counting channel
  }

  if (author.id === client.user.id) {
    return; // Ignore bot's own message
  }

  const expression = content;

  let result, expected;
  try {
    result = math.evaluate(expression);
    expected = countingChannel.currentCount + countingChannel.incrementValue; // Determine the expected number based on the current count and increment value
  } catch (error) {
    console.error('Error evaluating math expression:', error);
    return;
  }

  console.log('Expression:', expression);
  console.log('Result:', result);
  console.log('Expected:', expected);

  const tolerance = 1e-10; // Define a tolerance for comparison

  if (Math.abs(result - expected) < tolerance) {
    console.log('Expression matches expected value');
    await handleCorrectCounting(message, expression, author);
  } else {
    console.log('Expression does not match expected value');
    console.log('Difference:', expected.toString().split('').map((char, i) => expression[i] === char ? ' ' : '^').join(''));
    await handleGameFailure(guild, author, 'Wrong number', message, expected.toString(), countingChannel.incrementValue);
  }

  countingChannel.previousCount = expression;
}

async function handleCorrectCounting(message, expression, author) {
  const guildId = message.guild.id;
  const countingChannel = countingChannels[guildId];

  console.log('Correct counting!');
  console.log('Current count:', countingChannel.currentCount);
  console.log('Last user count:', countingChannel.lastUserCount);

  if (author.id === countingChannel.lastUserCount) {
    console.log('Counted twice in a row, treating it as a mistake');
    console.log('Expected next count:', countingChannel.currentCount + countingChannel.incrementValue);
    await handleGameFailure(message.guild, author, 'Counted twice in a row', message, (countingChannel.currentCount + countingChannel.incrementValue).toString(), countingChannel.incrementValue);
  } else {
    countingChannel.currentCount += countingChannel.incrementValue;
    countingChannel.lastUserCount = author.id;
    countingChannel.totalNumbersCounted++; // Increment the total number of numbers counted
    if (countingChannel.currentCount > countingChannel.highScore) {
      countingChannel.highScore = countingChannel.currentCount;
      await updateHighScore(guildId);
      message.react('🏆').catch(console.error);
    }
    await updateCountingChannel(guildId);
    message.react('✅').catch(console.error);
  }
}






async function handleGameFailure(guild, author, reason, message, expectedNumber, increment) {
  const guildId = guild.id;
  const countingChannel = countingChannels[guildId];

  console.log('Game failed, resetting counting...');
  countingChannel.currentCount = 0;
  countingChannel.previousCount = 0;
  countingChannel.lastUserCount = null;
  countingChannel.gameFailed = true;

  const oldChannel = guild.channels.cache.get(countingChannel.countingChannelId);

  if (oldChannel) {
    await sendFailureMessage(guild, author, reason, message, expectedNumber, increment);

    await deleteCountingChannel(guild, oldChannel);

    console.log('Counting channel deleted:', countingChannel.countingChannelId);
  } else {
    console.error('Error fetching old counting channel:', countingChannel.countingChannelId);
  }
}

async function duplicateCountingChannel(guild, countingChannelObject) {
  const guildId = guild.id;
  const countingChannel = countingChannels[guildId];

  try {
    const newChannel = await countingChannelObject.clone({ name: countingChannelObject.name });
    console.log('Counting channel duplicated:', newChannel.id);

    return newChannel.id; // Return the new channel ID
  } catch (error) {
    console.error('Error duplicating counting channel:', error);
    return null;
  }
}

async function deleteCountingChannel(guild, countingChannelObject) {
  try {
    if (countingChannelObject && guild.channels.cache.has(countingChannelObject.id)) {
      await countingChannelObject.delete();
      console.log('Counting channel deleted:', countingChannelObject.id);
    } else {
      console.log('Counting channel not found or already deleted.');
    }
  } catch (error) {
    console.error('Error deleting counting channel:', error);
  }
}

async function updateCountingChannel(guildId) {
  const countingChannel = countingChannels[guildId];
  try {
    await pool.query(
      'UPDATE count_table SET current_count = ?, previous_count = ?, last_user_count = ?, game_failed = ?, channel_id = ?, total_numbers_counted = ? WHERE guild_id = ?',
      [countingChannel.currentCount, countingChannel.previousCount, countingChannel.lastUserCount, countingChannel.gameFailed, countingChannel.countingChannelId, countingChannel.totalNumbersCounted, guildId]
    );
    console.log('Counting channel updated in database:', countingChannel.countingChannelId);
  } catch (error) {
    console.error('Error updating counting channel:', error);
  }
}



async function updateHighScore(guildId) {
  const countingChannel = countingChannels[guildId];
  try {
    const currentHighScore = await getHighScoreFromDB(guildId);
    if (!currentHighScore || countingChannel.totalNumbersCounted > currentHighScore) {
      await pool.query('UPDATE count_table SET high_score = ? WHERE guild_id = ?', [countingChannel.totalNumbersCounted, guildId]);
      console.log('High score updated:', countingChannel.totalNumbersCounted);
    }
  } catch (error) {
    console.error('Error updating high score:', error);
  }
}

async function getHighScoreFromDB(guildId) {
  try {
    const result = await pool.query('SELECT high_score FROM count_table WHERE guild_id = ?', [guildId]);
    return result.length > 0 ? result[0].high_score : null;
  } catch (error) {
    console.error('Error retrieving high score from the database:', error);
    return null;
  }
}



async function getCountingChannelsFromDB() {
  try {
    const result = await pool.query('SELECT guild_id, channel_id, current_count, previous_count, last_user_count, game_failed, high_score, increment_value FROM count_table');
    return result.length > 0 ? result : null;
  } catch (error) {
    console.error('Error retrieving counting channels from the database:', error);
    return null;
  }
}

function assignCountingChannelValues(result) {
  return {
    countingChannelId: result.channel_id,
    currentCount: result.current_count,
    previousCount: result.previous_count,
    lastUserCount: result.last_user_count || null,
    gameFailed: result.game_failed,
    highScore: result.high_score || 0,
    incrementValue: result.increment_value || 1,
    totalNumbersCounted: result.total_numbers_counted || 0, // Set totalNumbersCounted to 0 if it is null
  };
}


// Function to get the failure reason text based on the reason code
function getFailureReasonText(reason) {
  switch (reason) {
    case 'Wrong number':
      return 'Counting Error';
    case 'Counted twice in a row':
      return 'Counted twice in a row';
    default:
      return '';
  }
}

async function loadIncrementValue(guildId) {
  try {
    const result = await pool.query('SELECT increment_value FROM count_table WHERE guild_id = ?', [guildId]);
    if (result.length > 0) {
      const incrementValue = result[0].increment_value || 1;
      if (!countingChannels[guildId]) {
        countingChannels[guildId] = {};
      }
      countingChannels[guildId].incrementValue = incrementValue;
      console.log('Increment value loaded:', incrementValue);
    } else {
      if (!countingChannels[guildId]) {
        countingChannels[guildId] = {};
      }
      countingChannels[guildId].incrementValue = 1;
      console.log('Using default increment value:', 1);
    }
  } catch (error) {
    console.error('Error loading increment value:', error);
  }
}


async function sendFailureMessage(guild, author, reason, message, expectedNumber, increment) {
  const guildId = guild.id;
  const countingChannel = countingChannels[guildId];
  const countingChannelId = countingChannel.countingChannelId;

  const failureReason = getFailureReasonText(reason);
  const content = message.content.toString();
  const expected = expectedNumber !== null && expectedNumber !== '' ? expectedNumber.toString() : 'Unknown';

  const userMention = `<@${author.id}>`;

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('Counting Game Failure')
    .setDescription('See details below')
    .setTimestamp();

  try {
    const oldChannel = guild.channels.cache.get(countingChannelId);

    if (oldChannel) {
      const newChannel = await duplicateCountingChannel(guild, oldChannel);

      await deleteCountingChannel(guild, oldChannel);

      console.log('Counting channel deleted:', countingChannelId);

      countingChannel.countingChannelId = newChannel;
      console.log('Counting channel updated:', countingChannel.countingChannelId);

      const updatedChannel = guild.channels.cache.get(newChannel);

      if (updatedChannel) {
        await updatedChannel.send(userMention);

        await loadIncrementValue(guild.id);
        console.log('Current increment value:', countingChannel.incrementValue);

        const inc = countingChannel.incrementValue.toString();

        embed.addFields(
          { name: 'User', value: userMention },
          { name: 'Reason', value: failureReason },
          { name: 'Message that Caused Failure', value: content },
          { name: 'Expected Number', value: expected },
          { name: 'Increment', value: inc }
        );

        await updatedChannel.send({ embeds: [embed] });

        await updateCountingChannel(guildId);
        console.log('Counting channel updated in database:', countingChannel.countingChannelId);
      } else {
        console.error('Counting channel not found:', newChannel);
      }
    } else {
      console.error('Counting channel not found:', countingChannelId);
    }
  } catch (error) {
    console.error('Error sending failure message:', error);
  }
}

module.exports = {
  setCountingChannel,
  getCountingChannelId,
  handleCountingMessage,
  loadCountingChannels,
};
