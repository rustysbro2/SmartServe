const pool = require('../database.js');
const client = require('./bot.js'); // Replace with the actual path to your client file

async function sendVoteReminder(userId) {
    try {
        // Retrieve user information for the vote reminder
        const userResult = await pool.query('SELECT * FROM users WHERE discord_id = ?', [userId]);
        const user = userResult[0];

        // Use the existing client instance to send the vote reminder
        const userDM = await client.users.fetch(userId);
        
        // Send the vote reminder as a DM
        await userDM.send('Reminder: Don\'t forget to vote!');
        
        console.log(`Vote reminder sent to user with Discord ID ${userId}`);
    } catch (error) {
        console.error(`Error sending vote reminder to user with Discord ID ${userId}:`, error);
    }
}


let fetch;

import('node-fetch').then(nodeFetch => {
    fetch = nodeFetch.default;
    main();  // calling main function after fetch is defined.
});

async function main() {
    const url = 'https://top.gg/api/bots/1105598736551387247/check?userId=385324994533654530';
    const options = {
        method: 'GET',
        headers: {
            'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjExMDU1OTg3MzY1NTEzODcyNDciLCJib3QiOnRydWUsImlhdCI6MTY4NjU5ODIwNH0.N6KsGwiWY-RhALqC0f5VidMD2ZhH2m8fRpaWMeiBnq4'
        }
    };

    try {
        const response = await fetch(url, options);

        // Check if the request was successful
        if (response.ok) {
            const data = await response.json();
            console.log(data);

            if (data.voted === 0) {
                // User has not voted
                console.log('User has not voted.');

                // Add the user to the vote reminder system if not opted out
                const userOptedOut = await checkUserOptOut(data.userId);
                if (!userOptedOut) {
                    await addUserToReminder(data.userId);
                    console.log('Added user to the vote reminder system.');

                    // Send the vote reminder to the user
                    await sendVoteReminder(data.userId);
                    console.log('Vote reminder sent to user.');
                } else {
                    console.log('User has opted out of the vote reminder.');
                }
            } else {
                console.log('User has voted.');
            }
        } else {
            // If the request failed, throw an error
            const error = new Error(`HTTP Error: ${response.statusText}`);
            error.status = response.status;
            error.response = response;
            throw error;
        }
    } catch (error) {
        console.error(`Error: ${error.status} ${error.message}`);
        console.error(`Response Headers: ${JSON.stringify(Array.from(error.response.headers.entries()))}`);
    }
}

async function checkUserOptOut(userId) {
    try {
        // Check if the user has opted out of the vote reminder
        const userResult = await pool.query('SELECT vote_reminder_status FROM users WHERE discord_id = ?', [userId]);
        return userResult.length > 0 && userResult[0].vote_reminder_status === false;
    } catch (error) {
        console.error(`Error checking if user with Discord ID ${userId} has opted out of the vote reminder:`, error);
        return false;
    }
}

async function addUserToReminder(userId) {
    try {
        // Add the user to the vote reminder system
        await pool.query('INSERT INTO users (discord_id, vote_reminder_status) VALUES (?, true)', [userId]);
    } catch (error) {
        console.error(`Error adding user with Discord ID ${userId} to the vote reminder system:`, error);
    }
}

// ... (Other code)

module.exports = {
    sendVoteReminder
};
