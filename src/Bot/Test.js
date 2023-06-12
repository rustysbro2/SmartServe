// webhook.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

const app = express();
const port = 3001;

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  // Handle POST requests to the /webhook route
  const { user, isWeekend } = req.body;

  // Process the vote notification as needed
  console.log(`Received vote notification for user ${user} (Weekend: ${isWeekend})`);

  // Retrieve the bot's information from top.gg API
  try {
    const botId = process.env.BOT_ID;
    const botInfoUrl = `https://top.gg/api/bots/${botId}`;

    const response = await axios.get(botInfoUrl, {
      headers: {
        Authorization: process.env.TOPGG_TOKEN,
      },
    });

    const botInfo = response.data;
    console.log('Bot Information:', botInfo);
  } catch (error) {
    console.error('Error retrieving bot information:', error);
  }

  // Retrieve the vote data from top.gg API
  try {
    const votesUrl = `https://top.gg/api/bots/${process.env.BOT_ID}/votes`;
    const response = await axios.get(votesUrl, {
      headers: {
        Authorization: process.env.TOPGG_TOKEN,
      },
    });

    const votes = response.data;
    console.log('Votes:', votes);
  } catch (error) {
    console.error('Error retrieving vote data:', error);
  }

  res.sendStatus(200);
});

app.get('/webhook', (req, res) => {
  // Handle GET requests to the /webhook route
  res.send('Webhook endpoint');
});

function start() {
  app.listen(port, () => {
    console.log(`Webhook server is running on port ${port}`);
  });
}

module.exports = {
  start
};
