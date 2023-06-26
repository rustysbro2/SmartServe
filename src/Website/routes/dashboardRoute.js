const express = require('express');
const router = express.Router();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers]
});

// Define the dashboard route
router.get('/', async (req, res) => {
  try {
    const guilds = client.guilds.cache;

    // Filter the guilds to include only the servers where your bot is a member
    const botGuilds = guilds.filter(guild => guild.members.cache.has(client.user.id));

    const serverList = botGuilds.map(guild => ({
      id: guild.id,
      name: guild.name,
      iconURL: guild.iconURL({ dynamic: true, format: 'png', size: 4096 }),
      memberCount: guild.memberCount,
      nameAcronym: generateAcronym(guild.name)
    }));

    res.render('dashboard', { servers: serverList });
  } catch (error) {
    console.error('Error fetching guilds:', error);
    res.status(500).send('Error fetching guilds');
  }
});

// Generate acronym from server name
function generateAcronym(name) {
  const words = name.split(' ');
  let acronym = '';

  for (const word of words) {
    acronym += word[0];
  }

  return acronym.toUpperCase();
}

// Start the bot and connect to Discord
client.login(process.env.TOKEN);

module.exports = router;
