require('dotenv').config({ path: './src/.env' });

const { Client, GatewayIntentBits } = require('discord.js');
const { CLIENT_ID, TOKEN, guildId } = process.env;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);

  try {
    const globalCommands = await client.application.commands.fetch();
    let deletedGlobalCount = 0;

    for (const command of globalCommands.values()) {
      await command.delete();
      console.log(`Deleted global command "${command.name}"`);
      deletedGlobalCount++;
    }

    console.log(`Successfully deleted ${deletedGlobalCount} global commands.`);

    if (guildId) {
      const guild = await client.guilds.fetch(guildId);
      const guildCommands = await guild.commands.fetch();
      let deletedGuildCount = 0;

      for (const command of guildCommands.values()) {
        await command.delete();
        console.log(`Deleted guild-specific command "${command.name}" in guild ${guild.name}`);
        deletedGuildCount++;
      }

      console.log(`Successfully deleted ${deletedGuildCount} guild-specific commands in guild ${guild.name}.`);
    }
  } catch (error) {
    console.error('Error deleting commands:', error);
  }

  client.destroy();
});

client.login(TOKEN);
