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

      // Your counting game logic here
    });
  }
};
