const express = require('express');
const router = express.Router();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers]
});

// Define the dashboard route
router.get('/', async (req, res) => {
  try {
    // Connect the client to Discord
    await client.login(process.env.TOKEN);

    // Fetch the user's guilds from Discord
    const userGuilds = await client.guilds.fetch();

    // Filter the guilds based on the user's guilds
    const botGuilds = userGuilds.filter(guild =>
      req.user.guilds.includes(guild.id) && guild.members.cache.has(client.user.id)
    );

    // Create the server list array
    const serverList = botGuilds.map(guild => ({
      id: guild.id,
      name: guild.name,
      iconURL: guild.iconURL({ dynamic: true, format: 'png', size: 4096 }),
      memberCount: guild.memberCount,
      nameAcronym: generateAcronym(guild.name)
    }));

    // Log the fetched guilds for debugging
    console.log('User Guilds:', userGuilds);
    console.log('Bot Guilds:', botGuilds);
    console.log('Server List:', serverList);

    // Render the dashboard template with the server list
    res.render('dashboard', { servers: serverList });
  } catch (error) {
    console.error('Error fetching guilds:', error);
    res.status(500).send('Error fetching guilds');
  } finally {
    // Disconnect the client from Discord
    await client.destroy();
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
