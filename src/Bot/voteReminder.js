const fetch = require('node-fetch');
require('dotenv').config();

// Get your top.gg token from the .env file
const TOPGG_TOKEN = process.env.TOPGG_TOKEN;

// Set the reminder interval (in milliseconds)
const REMINDER_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Function to send a reminder message to a channel
async function sendVoteReminder(channel) {
    try {
        // Fetch the bot information from top.gg API
        const response = await fetch(`https://top.gg/api/bots/${channel.client.user.id}`, {
            headers: { 'Authorization': TOPGG_TOKEN }
        });
        const botData = await response.json();

        // Get the vote URL from the bot data
        const voteUrl = botData.url;

        // Send the reminder message
        channel.send(`Don't forget to vote for the bot! You can vote [here](${voteUrl}).`);
    } catch (error) {
        console.error('Error fetching bot data:', error);
    }
}

// Function to start the reminder loop
function startVoteReminderLoop(client) {
    // Find the channel ID where you want to send the reminder
    const channelId = 'YOUR_CHANNEL_ID';

    // Get the channel object from the channel ID
    const channel = client.channels.cache.get(channelId);

    // Send the initial reminder
    sendVoteReminder(channel);

    // Set up the interval for subsequent reminders
    setInterval(() => {
        sendVoteReminder(channel);
    }, REMINDER_INTERVAL);
}

module.exports = {
    startVoteReminderLoop
};
