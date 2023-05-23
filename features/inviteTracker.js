// features/inviteTracker.js
const db = require('../database.js');
const { MessageEmbed } = require('discord.js');

let invites = {};
let inviteChannels = {};

async function fetchInvites(guild) {
    const guildInvites = await guild.invites.fetch();
    invites[guild.id] = guildInvites;
}

db.query(`
    CREATE TABLE IF NOT EXISTS invites (
        code VARCHAR(255) PRIMARY KEY,
        inviter VARCHAR(255),
        uses INT
    )
`, function (error) {
    if (error) throw error;
});

module.exports = {
    name: 'inviteTracker',
    async execute(client) {
module.exports = {
    name: 'inviteTracker',
    async execute(client) {
        // ... rest of the code ...
    },
    setInviteChannel(guildId, channelId) {
        inviteChannels[guildId] = channelId;
    },
};
