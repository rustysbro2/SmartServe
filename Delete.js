const { Client, GatewayIntentBits } = require('discord.js');
const { clientId, token } = require('./config.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);

  try {
    // Deleting global commands
    const globalCommands = await client.application.commands.fetch();
    let deletedGlobalCount = 0;

    for (const command of globalCommands.values()) {
      await command.delete();
      console.log(`Deleted global command "${command.name}"`);
      deletedGlobalCount++;
    }

    console.log(`Successfully deleted ${deletedGlobalCount} global commands.`);

    // Deleting guild-specific commands
    const guilds = client.guilds.cache; // Fetches all the guilds the bot is a member of

    for (const guild of guilds.values()) {
      const guildCommands = await guild.commands.fetch();
      let deletedGuildCount = 0;

      for (const command of guildCommands.values()) {
        await command.delete();
        console.log(`Deleted guild-specific command "${command.name}" in guild "${guild.name}"`);
        deletedGuildCount++;
      }

      console.log(`Successfully deleted ${deletedGuildCount} guild-specific commands in guild "${guild.name}".`);
    }
  } catch (error) {
    console.error('Error deleting commands:', error);
  }

  client.destroy();
});

client.login(token);
