const { pool } = require('../../database');

async function strikePlayer(guildId, userId, reason) {
    try {
        const [rows] = await pool.execute(
            `INSERT INTO strikes (guildId, userId, reason) VALUES (?, ?, ?)`,
            [guildId, userId, reason]
        );
        return rows.affectedRows > 0;
    } catch (err) {
        console.log(err);
        return false;
    }
}

async function getStrikes(guildId) {
    try {
        const [rows] = await pool.execute(
            `SELECT userId, reason, COUNT(*) as strikeCount FROM strikes WHERE guildId = ? GROUP BY userId, reason`,
            [guildId]
        );
        return rows;
    } catch (err) {
        console.log(err);
        return [];
    }
}

async function setStrikeChannel(guildId, channelId) {
    try {
        const [rows] = await pool.execute(
            `INSERT INTO config (guildId, key, value) VALUES (?, 'strikeChannelId', ?) ON DUPLICATE KEY UPDATE value = ?`,
            [guildId, channelId, channelId]
        );
        return rows.affectedRows > 0;
    } catch (err) {
        console.log(err);
        return false;
    }
}

async function getStrikeChannel(guildId) {
    try {
        const [rows] = await pool.execute(
            `SELECT value FROM config WHERE guildId = ? AND key = 'strikeChannelId'`,
            [guildId]
        );
        return rows.length > 0 ? rows[0].value : null;
    } catch (err) {
        console.log(err);
        return null;
    }
}

module.exports = { strikePlayer, getStrikes, setStrikeChannel, getStrikeChannel };
