const { ShardingManager } = require("discord.js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

if (process.env.BETA === "true") {
  global.token = process.env.TOKEN_BETA;
} else {
  global.token = process.env.TOKEN;
}

console.log("Value of global.token:", global.token);

if (!global.token) {
  console.error("Error: The token is not set in the environment variable.");
  process.exit(1);
}

const manager = new ShardingManager("./bot.js", { token: global.token });

manager.on("shardCreate", (shard) => {
  console.log(`Launched shard ${shard.id}`);
});

manager.spawn();