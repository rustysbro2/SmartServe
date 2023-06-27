const express = require('express');
const router = express.Router();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers]
});

// Define the dashboard route
// Define the dashboard route
// Define the dashboard route
router.get('/', async (req, res) => {
  try {
    const serverList = [
      {
        id: '123456789',
        name: 'Server 1',
        iconURL: 'https://example.com/server1-icon.png',
        memberCount: 10,
        nameAcronym: 'S1'
      },
      {
        id: '987654321',
        name: 'Server 2',
        iconURL: 'https://example.com/server2-icon.png',
        memberCount: 20,
        nameAcronym: 'S2'
      }
    ];

    res.render('dashboard', { servers: serverList });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).send('Error rendering dashboard');
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
