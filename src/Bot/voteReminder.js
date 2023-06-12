require('dotenv').config();
const fetch = require('isomorphic-fetch');

// Get your top.gg token from the .env file
const TOPGG_TOKEN = process.env.TOPGG_TOKEN;

// Set the reminder interval (in milliseconds)
const REMINDER_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Function to send a reminder message to a channel
async function sendVoteReminder(client, guildId, channelId) {
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.log(`Invalid guild with ID ${guildId}`);
            return;
        }
        
        const channel = await client.channels.fetch(channelId).catch(err => console.error(`Error fetching channel with ID ${channelId}:`, err));
        if (!channel) {
            console.log(`Channel with ID ${channelId} not found.`);
            return;
        }
        
        if (channel.type !== '0') {
            console.log(`Invalid or non-text channel with ID ${channelId}`);
            return;
        }
        
        const response = await fetch(`https://top.gg/api/bots/${client.user.id}`, {
            headers: { 'Authorization': TOPGG_TOKEN }
        });
        const botData = await response.json();

        const voteUrl = botData.url;

        channel.send(`Don't forget to vote for the bot! You can vote [here](${voteUrl}).`);
    } catch (error) {
        console.error('Error in sendVoteReminder function:', error);
    }
}

// Function to start the reminder loop
function startVoteReminderLoop(client) {
    // Find the guild ID and channel ID where you want to send the reminder
    const guildId = '1106643216125665350';
    const channelId = '1115393015079514254';

    // Send the initial reminder
    sendVoteReminder(client, guildId, channelId);

    // Set up the interval for subsequent reminders
    setInterval(() => {
        sendVoteReminder(client, guildId, channelId);
    }, REMINDER_INTERVAL);
}

module.exports = {
    startVoteReminderLoop
};
