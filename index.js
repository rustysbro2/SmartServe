const Discord = require("discord.js");

const client = new Discord.Client();

const shardingManager = new Discord.ShardingManager(client);

shardingManager.options = {
  shardCount: 10,
  shardThreshold: 1000,
};

shardingManager.start();

client.on("ready", () => {
  console.log("Bot is ready!");
});

client.on("message", (message) => {
  // Do something with the message.
});

client.login("YOUR_BOT_TOKEN");
