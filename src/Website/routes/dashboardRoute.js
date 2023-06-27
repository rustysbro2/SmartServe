const express = require('express');
const router = express.Router();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// Define the dashboard route
router.get('/', async (req, res) => {
  try {
    const userGuilds = req.user.guilds; // Assuming req.user contains information about the authenticated user's guilds

    console.log('User Guilds:', userGuilds);

    const botGuilds = userGuilds.filter(guild =>
      userGuilds.some(userGuild => userGuild.id === guild.id) &&
      client.guilds.cache.has(guild.id) && // Check if the bot is a member of the guild
      client.guilds.cache.get(guild.id).members.cache.has(client.user.id) // Check if the bot is a member of the guild
    );

    console.log('Bot Guilds:', botGuilds);

    const serverList = botGuilds.map(guild => ({
      id: guild.id,
      name: guild.name,
      iconURL: guild.iconURL ? guild.iconURL({ dynamic: true, format: 'png', size: 4096 }) : 'https://example.com/default-icon.png', // Provide a default URL or fallback value for the icon
      memberCount: guild.memberCount,
      nameAcronym: generateAcronym(guild.name)
    }));

    console.log('Server List:', serverList);

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