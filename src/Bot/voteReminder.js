require('dotenv').config();
const fetch = require('isomorphic-fetch');
const pool = require('../database.js');

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
        
        if (channel.type !== "GUILD_TEXT") {
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
async function startVoteReminderLoop(client) {
    // Initialize lastVoteTime for all users to the current time
    const currentTime = new Date();

    try {
        await pool.query('UPDATE topgg_opt SET lastVoteTime = ?', [currentTime]);
        console.log('Initialized lastVoteTime for all users to the current time.');
    } catch (error) {
        console.error('Error updating the database:', error);
    }

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

// Function to simulate a vote for testing
async function simulateVote(client, discordId) {
  try {
    const currentTime = new Date(Date.now() - (13 * 60 * 60 * 1000));

    console.log('Query:', 'UPDATE topgg_opt SET lastVoteTime = ? WHERE discordId = ?');
    console.log('Parameters:', [currentTime, discordId]);

    const result = await pool.query('UPDATE topgg_opt SET lastVoteTime = ? WHERE discordId = ?', [currentTime, discordId]);
    console.log('Affected Rows:', result.affectedRows);

    const user = await client.users.fetch(discordId);
    if (!user) {
        console.log(`User with ID ${discordId} not found.`);
        return;
    }
    user.send(`This is a test reminder to vote!`);
  } catch (error) {
    console.error('Error simulating vote:', error);
  }
}




module.exports = {
    startVoteReminderLoop,
    simulateVote
};
