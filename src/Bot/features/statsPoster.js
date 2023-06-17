const fetch = require('node-fetch');
require('dotenv').config();

const botId = process.env.BOT_ID;
const topGGToken = process.env.TOPGG_TOKEN;

async function postStats(botId, botToken, apiUrl) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': TOPGG_TOKEN;
    },
    body: JSON.stringify({
      server_count: botId.guilds.cache.size,
      shard_count: botId.shard ? botId.shard.count : 1
    })
  });

  if (response.ok) {
    console.log('Stats successfully posted!');
  } else {
    console.log(`Failed to post stats. Error: ${response.statusText}`);
  }
}

module.exports = postStats;
