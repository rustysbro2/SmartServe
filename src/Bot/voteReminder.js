require('dotenv').config();
const fetch = require('isomorphic-fetch');
const pool = require('../database.js');

// Get your top.gg token from the .env file
const TOPGG_TOKEN = process.env.TOPGG_TOKEN;

// Set the reminder interval (in milliseconds)
const REMINDER_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours

// Function to send a reminder message to a user
async function sendVoteReminder(client, discordId) {
    try {
        const user = await client.users.fetch(discordId);
        if (!user) {
            console.log(`User with ID ${discordId} not found.`);
            return;
        }
        
        const response = await fetch(`https://top.gg/api/bots/${client.user.id}`, {
            headers: { 'Authorization': TOPGG_TOKEN }
        });
        const botData = await response.json();

        const voteUrl = botData.url;

        user.send(`Don't forget to vote for the bot! You can vote [here](${voteUrl}).`);
    } catch (error) {
        console.error('Error in sendVoteReminder function:', error);
    }
}

// Function to start the reminder loop
function startVoteReminderLoop(client) {
    setInterval(async () => {
        // Get the current time 12 hours ago
        const twelveHoursAgo = new Date(Date.now() - REMINDER_INTERVAL);

        try {
            // Query the database for users who last voted more than 12 hours ago
            const [rows] = await pool.query('SELECT discordId FROM topgg_opt WHERE lastVoteTime < ?', [twelveHoursAgo]);
            for (const row of rows) {
                // Send a reminder to each user
                await sendVoteReminder(client, row.discordId);
            }
        } catch (error) {
            console.error('Error querying the database:', error);
        }
    }, REMINDER_INTERVAL);
}

module.exports = {
    startVoteReminderLoop
};
