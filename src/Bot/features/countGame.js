const { pool } = require('../../database.js')
const { EmbedBuilder } = require('discord.js')
const math = require('mathjs')

const countingChannels = {}
const debug = false

function printDebugMessage (...args) {
  if (debug) {
    console.log(...args)
  }
}

async function setCountingChannel (guildId, channelId) {
  countingChannels[guildId] = {
    countingChannelId: channelId,
    guildId,
    currentCount: 0,
    previousCount: 0,
    lastUserCount: null,
    gameFailed: false,
    highScore: 0,
    incrementValue: 1,
    totalNumbersCounted: 0
  }

  try {
    countingChannels[guildId].countingChannelId = channelId
    printDebugMessage(
      'Counting channel ID updated in countingChannels object:',
      countingChannels[guildId].countingChannelId
    )

    await updateCountingChannel(guildId)
    printDebugMessage('Counting channel set:', channelId)
  } catch (error) {
    console.error('Error setting counting channel:', error)
  }
}

async function loadCountingChannels () {
  try {
    const results = await getCountingChannelsFromDB()
    if (results) {
      results.forEach((result) => {
        const guildId = result.guild_id
        countingChannels[guildId] = assignCountingChannelValues(result)
        printDebugMessage(
          'Counting channel loaded:',
          countingChannels[guildId].countingChannelId
        )
      })
    }
  } catch (error) {
    console.error('Error loading counting channels:', error)
  }
}

function getCountingChannelId (guildId) {
  const countingChannel = countingChannels[guildId]
  return countingChannel ? countingChannel.countingChannelId : null
}

async function handleCountingMessage (message) {
  const { channelId, content, author, client, guild } = message
  const guildId = guild.id

  const countingChannel = countingChannels[guildId]
  if (!countingChannel || channelId !== countingChannel.countingChannelId) {
    return
  }

  if (author.id === client.user.id) {
    return
  }

  const expression = content

  let result, expected
  try {
    result = math.evaluate(expression)
    expected = countingChannel.currentCount + countingChannel.incrementValue
  } catch (error) {
    console.error('Error evaluating math expression:', error)
    return
  }

  printDebugMessage('Expression:', expression)
  printDebugMessage('Result:', result)
  printDebugMessage('Expected:', expected)

  const tolerance = 1e-10

  if (Math.abs(result - expected) < tolerance) {
    printDebugMessage('Expression matches expected value')
    await handleCorrectCounting(message, expression, author)
  } else {
    printDebugMessage('Expression does not match expected value')
    printDebugMessage(
      'Difference:',
      expected
        .toString()
        .split('')
        .map((char, i) => (expression[i] === char ? ' ' : '^'))
        .join('')
    )
    await handleGameFailure(
      guild,
      author,
      'Wrong number',
      message,
      expected.toString(),
      countingChannel.incrementValue
    )
  }

  countingChannel.previousCount = expression
}

async function handleCorrectCounting (message, expression, author) {
  const guildId = message.guild.id
  const countingChannel = countingChannels[guildId]

  printDebugMessage('Correct counting!')
  printDebugMessage('Current count:', countingChannel.currentCount)
  printDebugMessage('Last user count:', countingChannel.lastUserCount)

  if (author.id === countingChannel.lastUserCount) {
    printDebugMessage('Counted twice in a row, treating it as a mistake')
    printDebugMessage(
      'Expected next count:',
      countingChannel.currentCount + countingChannel.incrementValue
    )
    await handleGameFailure(
      message.guild,
      author,
      'Counted twice in a row',
      message,
      (
        countingChannel.currentCount + countingChannel.incrementValue
      ).toString(),
      countingChannel.incrementValue
    )
  } else {
    countingChannel.currentCount += countingChannel.incrementValue
    countingChannel.lastUserCount = author.id
    countingChannel.totalNumbersCounted++

    if (countingChannel.currentCount > countingChannel.highScore) {
      countingChannel.highScore = countingChannel.currentCount
      await updateHighScore(guildId)
      message.react('🏆').catch(console.error)
    }

    await updateCountingChannel(guildId)
    message.react('✅').catch(console.error)
  }
}

async function handleGameFailure (
  guild,
  author,
  reason,
  message,
  expectedNumber,
  increment
) {
  const guildId = guild.id
  const countingChannel = countingChannels[guildId]

  printDebugMessage('Game failed, resetting counting...')
  countingChannel.currentCount = 0
  countingChannel.previousCount = 0
  countingChannel.lastUserCount = null
  countingChannel.gameFailed = true

  const oldChannel = guild.channels.cache.get(
    countingChannel.countingChannelId
  )

  if (oldChannel) {
    await sendFailureMessage(
      guild,
      author,
      reason,
      message,
      expectedNumber,
      increment
    )
    await deleteCountingChannel(guild, oldChannel)
    printDebugMessage(
      'Counting channel deleted:',
      countingChannel.countingChannelId
    )
  } else {
    console.error(
      'Error fetching old counting channel:',
      countingChannel.countingChannelId
    )
  }
}

async function duplicateCountingChannel (guild, countingChannelObject) {
  const guildId = guild.id
  const countingChannel = countingChannels[guildId]

  try {
    const newChannel = await countingChannelObject.clone({
      name: countingChannelObject.name
    })
    printDebugMessage('Counting channel duplicated:', newChannel.id)
    return newChannel.id
  } catch (error) {
    console.error('Error duplicating counting channel:', error)
    return null
  }
}

async function deleteCountingChannel (guild, countingChannelObject) {
  try {
    if (
      countingChannelObject &&
      guild.channels.cache.has(countingChannelObject.id)
    ) {
      await countingChannelObject.delete()
      if (debug) {
        console.log('Counting channel deleted:', countingChannelObject.id)
      }
    } else {
      if (debug) {
        console.log('Counting channel not found or already deleted.')
      }
    }
  } catch (error) {
    console.error('Error deleting counting channel:', error)
  }
}

async function updateCountingChannel (guildId) {
  const countingChannel = countingChannels[guildId]
  try {
    await pool.query(
      'UPDATE count_table SET current_count = ?, previous_count = ?, last_user_count = ?, game_failed = ?, channel_id = ?, total_numbers_counted = ? WHERE guild_id = ?',
      [
        countingChannel.currentCount,
        countingChannel.previousCount,
        countingChannel.lastUserCount,
        countingChannel.gameFailed,
        countingChannel.countingChannelId,
        countingChannel.totalNumbersCounted,
        guildId
      ]
    )
    if (debug) {
      console.log(
        'Counting channel updated in database:',
        countingChannel.countingChannelId
      )
    }
  } catch (error) {
    console.error('Error updating counting channel:', error)
  }
}

async function updateHighScore (guildId) {
  const countingChannel = countingChannels[guildId]
  try {
    const currentHighScore = await getHighScoreFromDB(guildId)
    if (
      !currentHighScore ||
      countingChannel.totalNumbersCounted > currentHighScore
    ) {
      await pool.query(
        'UPDATE count_table SET high_score = ? WHERE guild_id = ?',
        [countingChannel.totalNumbersCounted, guildId]
      )
      printDebugMessage(
        'High score updated:',
        countingChannel.totalNumbersCounted
      )
    }
  } catch (error) {
    console.error('Error updating high score:', error)
  }
}

async function getHighScoreFromDB (guildId) {
  try {
    const result = await pool.query(
      'SELECT high_score FROM count_table WHERE guild_id = ?',
      [guildId]
    )
    return result.length > 0 ? result[0].high_score : null
  } catch (error) {
    console.error('Error retrieving high score from the database:', error)
    return null
  }
}

async function getCountingChannelsFromDB () {
  try {
    const result = await pool.query(
      'SELECT guild_id, channel_id, current_count, previous_count, last_user_count, game_failed, high_score, increment_value FROM count_table'
    )
    return result.length > 0 ? result : null
  } catch (error) {
    console.error(
      'Error retrieving counting channels from the database:',
      error
    )
    return null
  }
}

function assignCountingChannelValues (result) {
  return {
    countingChannelId: result.channel_id,
    currentCount: result.current_count,
    previousCount: result.previous_count,
    lastUserCount: result.last_user_count || null,
    gameFailed: result.game_failed,
    highScore: result.high_score || 0,
    incrementValue: result.increment_value || 1,
    totalNumbersCounted: result.total_numbers_counted || 0
  }
}

function getFailureReasonText (reason) {
  switch (reason) {
    case 'Wrong number':
      return 'Counting Error'
    case 'Counted twice in a row':
      return 'Counted twice in a row'
    default:
      return ''
  }
}

async function loadIncrementValue (guildId) {
  try {
    const result = await pool.query(
      'SELECT increment_value FROM count_table WHERE guild_id = ?',
      [guildId]
    )
    if (result.length > 0) {
      const incrementValue = result[0].increment_value || 1
      if (!countingChannels[guildId]) {
        countingChannels[guildId] = {}
      }
      countingChannels[guildId].incrementValue = incrementValue
      printDebugMessage('Increment value loaded:', incrementValue)
    } else {
      if (!countingChannels[guildId]) {
        countingChannels[guildId] = {}
      }
      countingChannels[guildId].incrementValue = 1
      printDebugMessage('Using default increment value:', 1)
    }
  } catch (error) {
    console.error('Error loading increment value:', error)
  }
}

async function sendFailureMessage (
  guild,
  author,
  reason,
  message,
  expectedNumber,
  increment
) {
  const guildId = guild.id
  const countingChannel = countingChannels[guildId]
  const countingChannelId = countingChannel.countingChannelId

  const failureReason = getFailureReasonText(reason)
  const content = message.content.toString()
  const expected =
    expectedNumber !== null && expectedNumber !== ''
      ? expectedNumber.toString()
      : 'Unknown'

  const userMention = `<@${author.id}>`

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('Counting Game Failure')
    .setDescription('See details below')
    .setTimestamp()

  try {
    const oldChannel = guild.channels.cache.get(countingChannelId)

    if (oldChannel) {
      const newChannel = await duplicateCountingChannel(guild, oldChannel)

      await deleteCountingChannel(guild, oldChannel)

      printDebugMessage('Counting channel deleted:', countingChannelId)

      countingChannel.countingChannelId = newChannel
      printDebugMessage(
        'Counting channel updated:',
        countingChannel.countingChannelId
      )

      const updatedChannel = guild.channels.cache.get(newChannel)

      if (updatedChannel) {
        await updatedChannel.send(userMention)

        await loadIncrementValue(guild.id)
        printDebugMessage(
          'Current increment value:',
          countingChannel.incrementValue
        )

        const inc = countingChannel.incrementValue.toString()

        embed.addFields(
          { name: 'User', value: userMention },
          { name: 'Reason', value: failureReason },
          { name: 'Message that Caused Failure', value: content },
          { name: 'Expected Number', value: expected },
          { name: 'Increment', value: inc }
        )

        await updatedChannel.send({ embeds: [embed] })

        await updateCountingChannel(guildId)
        printDebugMessage(
          'Counting channel updated in database:',
          countingChannel.countingChannelId
        )
      } else {
        console.error('Counting channel not found:', newChannel)
      }
    } else {
      console.error('Counting channel not found:', countingChannelId)
    }
  } catch (error) {
    console.error('Error sending failure message:', error)
  }
}

module.exports = {
  setCountingChannel,
  getCountingChannelId,
  handleCountingMessage,
  loadCountingChannels
}
