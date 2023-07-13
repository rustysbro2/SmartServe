const express = require('express');
const {
  handleVoteWebhook,
  checkAndRecordUserVote,
  checkAllGuildMembers,
  sendRecurringReminders
} = require('../features/voteRemind');

/**
 * Starts the web server for handling vote webhooks and other functionalities
 * @param {Client} client The Discord client instance
 */
function startWebServer(client) {
  const app = express();
  const port = 3006; // Replace with your desired port number

  app.use(express.json());

  // Define a POST route to handle the vote webhook
  app.post('/vote-webhook', (req, res) => {
    handleVoteWebhook(req, res, client); // Call the handleVoteWebhook function
  });

  // Handling guild member add event
  client.on('guildMemberAdd', (member) => {
    checkAndRecordUserVote(member);
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  // Call other functions
  checkAllGuildMembers(client);
  sendRecurringReminders(client);
}

module.exports = {
  startWebServer
};
