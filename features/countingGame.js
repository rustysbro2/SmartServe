// features/countingGame.js
const db = require('../database.js');

// Create the counting_game table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS counting_game (
    guild_id VARCHAR(255) PRIMARY KEY,
    count INT
  )
`, function (error) {
  if (error) throw error;
});

async function getCurrentCount(guildId) {
    let result = await db.query('SELECT count FROM counting_game WHERE guild_id = ?', [guildId]);

    // If the count doesn't exist, initialize it
    if (result.length === 0) {
        await db.query('INSERT INTO counting_game (guild_id, count) VALUES (?, ?)', [guildId, 1]);
        result = [{ count: 1 }];
    }

    return result[0].count;
}

async function increaseCount(guildId, nextCount) {
    const currentCount = await getCurrentCount(guildId);

    // Check if the provided count is valid
    if (nextCount === currentCount + 1) {
        // If it's valid, update the count in the database
        await db.query('UPDATE counting_game SET count = ? WHERE guild_id = ?', [nextCount, guildId]);
        return true;
    } else {
        // If it's not valid, reset the count
        await db.query('UPDATE counting_game SET count = ? WHERE guild_id = ?', [1, guildId]);
        return false;
    }
}

module.exports = {
    getCurrentCount,
    increaseCount
};
