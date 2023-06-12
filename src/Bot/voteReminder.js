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

        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            console.log(`Channel not found with ID ${channelId}`);
            return;
        }

        if (channel.type !== 'text') {
            console.log(`Channel with ID ${channelId} is not a text channel`);
            return;
        }

        const response = await fetch(`https://top.gg/api/bots/${client.user.id}`, {
            headers: { 'Authorization': TOPGG_TOKEN }
        });
        const botData = await response.json();

        const voteUrl = botData.url;

        channel.send(`Don't forget to vote for the bot! You can vote [here](${voteUrl}).`);
    } catch (error) {
        console.error('Error fetching bot data:', error);
    }
}




// Function to start the reminder loop
function startVoteReminderLoop(client) {
    // Find the guild ID and channel ID where you want to send the reminder
    const guildId = '1106643216125665350';
    const channelId = '1115393012500025414';

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
