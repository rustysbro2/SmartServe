const { pool } = require('../../database.js');
const { EmbedBuilder } = require('discord.js');
const math = require('mathjs');

let countingChannelId = null;
let currentCount = 0;
let previousCount = 0;
let lastUserCount = null;
let gameFailed = false;
let highScore = 0; // Represents the number of successful counts (high score)
let incrementValue = 1; // Default increment value

async function setCountingChannel(guildId, channelId) {
  countingChannelId = channelId;
  currentCount = 0;
  previousCount = 0;
  lastUserCount = null;
  gameFailed = false;
  highScore = 0;

  try {
    await updateCountingChannel(guildId, channelId, currentCount, previousCount, lastUserCount, gameFailed);
    console.log('Counting channel set:', channelId);
  } catch (error) {
    console.error('Error setting counting channel:', error);
  }
}

async function loadCountingChannel() {
  try {
    const result = await getCountingChannelFromDB();
    if (result) {
      assignCountingChannelValues(result);
      console.log('Counting channel loaded:', countingChannelId);
    }
  } catch (error) {
    console.error('Error loading counting channel:', error);
  }
}

function getCountingChannelId() {
  return countingChannelId;
}

async function handleCountingMessage(message) {
  const { channelId, content, author, client } = message;

  if (channelId !== countingChannelId) {
    return; // Ignore messages from other channels
  }

  if (author.id === client.user.id) {
    return; // Ignore bot's own message
  }

  const expression = content;

  let result, expected;
  try {
    result = math.evaluate(expression);
    expected = result.toString();
  } catch (error) {
    console.error('Error evaluating math expression:', error);
    return;
  }

  console.log('Expression:', expression);
  console.log('Result:', result);
  console.log('Expected:', expected);

  if (result == expected) {
    console.log('Expression matches expected value');
    await handleCorrectCounting(message, expression, author);
  } else {
    console.log('Expression does not match expected value');
    console.log('Difference:', expected.split('').map((char, i) => expression[i] === char ? ' ' : '^').join(''));
    await handleGameFailure(message.guild, author, 'Wrong number', message, expected, incrementValue);
  }

  previousCount = expression;
}











async function handleCorrectCounting(message, expression, author) {
  console.log('Correct counting!');
  console.log('Current count:', currentCount);
  console.log('Previous count:', previousCount);
  console.log('Last user count:', lastUserCount);

  if (author.id === lastUserCount) {
    console.log('Counted twice in a row, treating it as a mistake');
    console.log('Expected next count:', (currentCount + incrementValue));
    await handleGameFailure(message.guild, author, 'Counted twice in a row', message, (currentCount + incrementValue).toString(), incrementValue);
  } else {
    currentCount += incrementValue;
    lastUserCount = author.id;
    highScore++; // Increment the high score (number of successful counts)
    await updateCountingChannel(countingChannelId, currentCount, previousCount, lastUserCount, gameFailed);
    message.react('✅').catch(console.error);
    if (highScore > previousCount) {
      await updateHighScore();
      message.react('🏆').catch(console.error);
    }
  }
}



async function handleGameFailure(guild, author, reason, message, expectedNumber, increment) {
  console.log('Game failed, resetting counting...');
  currentCount = 0;
  previousCount = 0;
  lastUserCount = null;
  gameFailed = true;
  highScore = 0; // Reset the high score (number of successful counts)

  const newChannel = await duplicateCountingChannel(guild);

  if (newChannel) {
    await deleteCountingChannel(guild);
    countingChannelId = newChannel.id;
    await updateCountingChannelId(guild.id, countingChannelId);

    // Load the latest increment value from the database
    await loadIncrementValue();

    await sendFailureMessage(newChannel, author, reason, message, expectedNumber, incrementValue);
  } else {
    console.error('Error creating counting channel.');
  }
}

async function duplicateCountingChannel(guild) {
  try {
    const countingChannel = await guild.channels.fetch(countingChannelId);
    if (countingChannel) {
      const newChannel = await countingChannel.clone();
      console.log('Counting channel duplicated:', newChannel.id);
      return newChannel;
    }
  } catch (error) {
    console.error('Error duplicating counting channel:', error);
  }
  return null;
}

async function deleteCountingChannel(guild) {
  try {
    const countingChannel = await guild.channels.fetch(countingChannelId);
    if (countingChannel) {
      await countingChannel.delete();
      console.log('Counting channel deleted:', countingChannelId);
    }
  } catch (error) {
    console.error('Error deleting counting channel:', error);
  }
}

async function updateCountingChannelId(guildId, channelId) {
  try {
    await pool.query('UPDATE count_table SET channel_id = ? WHERE guild_id = ?', [channelId, guildId]);
    console.log('Counting channel ID updated in the database:', channelId);
  } catch (error) {
    console.error('Error updating counting channel ID in the database:', error);
  }
}

async function sendFailureMessage(channel, author, reason, message, expectedNumber, increment) {
  const failureReason = getFailureReasonText(reason);
  const content = message.content.toString();
  const expected = expectedNumber !== null && expectedNumber !== '' ? expectedNumber.toString() : 'Unknown';

  const userMention = `<@${author.id}>`; // Mention the user who failed

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('Counting Game Failure')
    .setDescription('See details below')
    .setTimestamp();

  try {
    const failureMessage = await channel.send(userMention); // Send the user mention separately
    await failureMessage.delete(); // Delete the user mention message immediately

    await loadIncrementValue(); // Load the increment value from the database
    console.log('Current increment value:', incrementValue);

    const inc = incrementValue.toString();

    embed.addFields(
      { name: 'User', value: userMention },
      { name: 'Reason', value: failureReason },
      { name: 'Message that Caused Failure', value: content },
      { name: 'Expected Number', value: expected },
      { name: 'Increment', value: inc }
    );

    await channel.send({ embeds: [embed] }); // Send the embed with failure details
  } catch (error) {
    console.error('Error sending failure message:', error);
  }
}

async function updateCountingChannel(channelId, currentCount, previousCount, lastUserCount, gameFailed) {
  try {
    await pool.query('UPDATE count_table SET current_count = ?, previous_count = ?, last_user_count = ?, game_failed = ? WHERE channel_id = ?', [currentCount, previousCount, lastUserCount, gameFailed, channelId]);
    console.log('Counting channel updated:', channelId);
  } catch (error) {
    console.error('Error updating counting channel:', error);
  }
}

async function updateHighScore() {
  try {
    await pool.query('UPDATE count_table SET high_score = ? WHERE channel_id = ?', [highScore, countingChannelId]);
    console.log('High score updated:', highScore);
  } catch (error) {
    console.error('Error updating high score:', error);
  }
}

async function getCountingChannelFromDB() {
  try {
    const result = await pool.query('SELECT channel_id, current_count, previous_count, last_user_count, game_failed, high_score, increment_value FROM count_table LIMIT 1');
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error retrieving counting channel from database:', error);
    return null;
  }
}

function assignCountingChannelValues(result) {
  countingChannelId = result.channel_id;
  currentCount = result.current_count;
  previousCount = result.previous_count;
  lastUserCount = result.last_user_count;
  gameFailed = result.game_failed;
  highScore = result.high_score || 0; // Initialize high score with 0 if not present
  incrementValue = result.increment_value || 1;
}

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

async function loadIncrementValue() {
  try {
    const result = await pool.query('SELECT increment_value FROM count_table WHERE channel_id = ?', [countingChannelId]);
    if (result.length > 0) {
      incrementValue = result[0].increment_value || 1;
      console.log('Increment value loaded:', incrementValue);
    }
  } catch (error) {
    console.error('Error loading increment value:', error);
  }
}

module.exports = {
  setCountingChannel,
  getCountingChannelId,
  handleCountingMessage,
  loadCountingChannel,
};
