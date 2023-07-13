const express = require('express');
const router = express.Router();
const { getClient } = require('../client');

// Get the client instance
const client = getClient();

// Define the dashboard route
router.get('/', async (req, res) => {
  try {
    const userGuilds = req.user.guilds; // Assuming req.user contains information about the authenticated user's guilds

    console.log('User Guilds:', userGuilds);

    const botGuilds = userGuilds.filter((guild) =>
      client.guilds.cache.has(guild.id)
    );

    console.log('Bot Guilds:', botGuilds);

    const serverList = botGuilds.map((guild) => ({
      id: guild.id,
      name: guild.name,
      iconURL: guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : 'https://cdn.discordapp.com/embed/avatars/0.png',
      memberCount: client.guilds.cache.get(guild.id).memberCount,
      // Add any other necessary properties from the guild object
    }));

    console.log('Server List:', serverList);

    res.render('dashboard', { servers: serverList });
  } catch (error) {
    console.error('Error fetching guilds:', error);
    res.status(500).send('Error fetching guilds');
  }
});

module.exports = router;
