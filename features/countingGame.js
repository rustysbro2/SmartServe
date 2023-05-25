const { Collection } = require('discord.js');
const db = require('../database.js');

let countingChannels = new Collection();

// Create the countingChannels table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS countingChannels (
    guildId VARCHAR(255) PRIMARY KEY,
    channelId VARCHAR(255)
  )
`, function (error) {
  if (error) throw error;
});

// Load counting channels from the database on startup
db.query(`
  SELECT * FROM countingChannels
`, function (error, results) {
  if (error) throw error;

  results.forEach(result => {
    const { guildId, channelId } = result;
    countingChannels.set(guildId, channelId);
  });

  console.log(`Loaded counting channels: ${countingChannels.size}`);
});

module.exports = {
  name: 'countingGame',
  async execute(client) {
    client.on('messageCreate', async (message) => {
      if (!message.guild) return;
      if (!countingChannels.has(message.guild.id)) return;
      if (message.channel.id !== countingChannels.get(message.guild.id)) return;

      const currentNumber = parseInt(message.content);
      if (isNaN(currentNumber)) return;

      const expectedNumber = await getNextExpectedNumber(message.guild.id);
      if (currentNumber !== expectedNumber) {
        await handleIncorrectNumber(message, expectedNumber);
      } else {
        await incrementCount(message.guild.id, currentNumber);
      }
    });
  }
};

async function getNextExpectedNumber(guildId) {
  return new Promise((resolve, reject) => {
    db.query(
      `
      SELECT expectedNumber FROM countingGame WHERE guildId = ?
      `,
      [guildId],
      function (error, results) {
        if (error) return reject(error);
        if (results.length > 0) {
          resolve(results[0].expectedNumber + 1);
        } else {
          resolve(1);
        }
      }
    );
  });
}

async function incrementCount(guildId, currentNumber) {
  return new Promise((resolve, reject) => {
    db.query(
      `
      INSERT INTO countingGame (guildId, expectedNumber)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
      expectedNumber = GREATEST(expectedNumber, ?)
      `,
      [guildId, currentNumber + 1, currentNumber + 1],
      function (error) {
        if (error) return reject(error);
        resolve();
      }
    );
  });
}

async function handleIncorrectNumber(message, expectedNumber) {
  const guildId = message.guild.id;
  const channelId = message.channel.id;
  const countingChannel = message.guild.channels.cache.get(channelId);

  // Reset counting game for the guild
  db.query(
    `
    DELETE FROM countingGame WHERE guildId = ?
    `,
    [guildId],
    function (error) {
      if (error) console.error(`Failed to reset counting game for guild ${guildId}:`, error);
    }
  );

  // Remove the counting channel from the collection
  countingChannels.delete(guildId);

  // Send error message and instructions
  const errorMessage = `You broke the counting game! The expected number was ${expectedNumber}.`;
  const instructions = 'Start over by sending the number 1.';
  countingChannel.send(`${errorMessage}\n${instructions}`)
    .catch((error) => {
      console.error(`Failed to send counting game error message in guild ${guildId}:`, error);
    });
}
