// features/inviteTracker.js
const db = require('../database.js');
const { MessageEmbed } = require('discord.js');

let invites = {};

async function fetchInvites(guild) {
    const guildInvites = await guild.invites.fetch();
    invites[guild.id] = guildInvites;
}

db.query(`
    CREATE TABLE IF NOT EXISTS inviteChannels (
        guildId VARCHAR(255) PRIMARY KEY,
        channelId VARCHAR(255)
    )
`, function (error) {
    if (error) throw error;
});

module.exports = {
    name: 'inviteTracker',
    async execute(client) {
        client.guilds.cache.forEach(guild => {
            fetchInvites(guild);
        });

        client.on('guildCreate', guild => {
            fetchInvites(guild);
            console.log(`Bot joined a new guild: ${guild.name}`);
        });

        client.on('guildMemberUpdate', async (oldMember, newMember) => {
            console.log(`Guild member updated: ${newMember.user.tag}`);
            if (newMember.user.bot) {
                db.query(`
                    SELECT channelId
                    FROM inviteChannels
                    WHERE guildId = ?
                `, [newMember.guild.id], async function (error, results) {
                    if (error) throw error;
                    if (results.length > 0) {
                        const channelId = results[0].channelId;
                        const channel = newMember.guild.channels.cache.get(channelId);
                        if (!channel) return;

                        console.log(`Bot joined: ${newMember.user.tag}. Sending message to channel: ${channel.name}`);

                        const embed = new MessageEmbed()
                            .setTitle("New Bot Joined!")
                            .setDescription(`${newMember.user.tag} has joined the server.`)
                            .setColor("#32CD32");
                        channel.send({ embeds: [embed] });
                    }
                });
            }
        });

        client.on('inviteCreate', async invite => {
            console.log(`Invite created: ${invite.code}`);
            if (!invites[invite.guild.id]) {
                await fetchInvites(invite.guild);
            } else {
                invites[invite.guild.id].set(invite.code, invite);
            }
        });
        
        client.on('inviteDelete', async invite => {
            console.log(`Invite deleted: ${invite.code}`);
            const cachedInvites = invites[invite.guild.id];
            cachedInvites.delete(invite.code);
        });
    },
    setInviteChannel(guildId, channelId) {
        console.log(`Setting invite channel: ${channelId} for guild: ${guildId}`);
        db.query(`
            INSERT INTO inviteChannels (guildId, channelId)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
            channelId = VALUES(channelId)
        `, [guildId, channelId], function (error) {
            if (error) throw error;
        });
    }
};
