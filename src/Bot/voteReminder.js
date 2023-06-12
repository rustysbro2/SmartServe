require('dotenv').config();
const fetch = require('isomorphic-fetch');

// Get your top.gg token from the .env file
const TOPGG_TOKEN = process.env.TOPGG_TOKEN;

// Set the reminder interval (in milliseconds)
const REMINDER_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Function to send a reminder message to a channel
async function sendVoteReminder(client, channelId) {
    try {
        const channel = client.channels.cache.get(channelId);
        if (channel && channel.type === 'text') {
            // Fetch the bot information from top.gg API
            const response = await fetch(`https://top.gg/api/bots/${client.user.id}`, {
                headers: { 'Authorization': TOPGG_TOKEN }
            });
            const botData = await response.json();

            // Get the vote URL from the bot data
            const voteUrl = botData.url;

            // Send the reminder message
            channel.send(`Don't forget to vote for the bot! You can vote [here](${voteUrl}).`);
        } else {
            console.log(`Invalid or non-text channel with ID ${channelId}`);
        }
    } catch (error) {
        console.error('Error fetching bot data:', error);
    }
}

// Function to start the reminder loop
function startVoteReminderLoop(client) {
    // Find the channel ID where you want to send the reminder
    const channelId = '1115393012500025414';

    // Send the initial reminder
    sendVoteReminder(client, channelId);

    // Set up the interval for subsequent reminders
    setInterval(() => {
        sendVoteReminder(client, channelId);
    }, REMINDER_INTERVAL);
}

module.exports = {
    startVoteReminderLoop
};
