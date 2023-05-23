// features/inviteTracker.js
const db = require('../database.js');
const { MessageEmbed } = require('discord.js');

let invites = {};

async function fetchInvites(guild) {
    const guildInvites = await guild.invites.fetch();
    invites[guild.id] = guildInvites;
    guildInvites.forEach(invite => updateInviteInDb(guild.id, invite.code, invite.uses, invite.inviter ? invite.inviter.id : null));
}

function updateInviteInDb(guildId, code, uses, inviterId) {
    db.query(`
        INSERT INTO invites (guildId, code, uses, inviterId)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        uses = VALUES(uses),
        inviterId = VALUES(inviterId)
    `, [guildId, code, uses, inviterId], function (error) {
        if (error) throw error;
    });
}

db.query(`
    CREATE TABLE IF NOT EXISTS invites (
        guildId VARCHAR(255),
        code VARCHAR(255),
        uses INT,
        inviterId VARCHAR(255),
        PRIMARY KEY (guildId, code)
    )
`, function (error) {
    if (error) throw error;
});

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

        client.on('guildMemberAdd', async member => {
            console.log(`New member added: ${member.user.tag}`);
            db.query(`
                SELECT *
                FROM invites
                WHERE guildId = ?
            `, [member.guild.id], async function (error, dbInvites) {
                if (error) throw error;
                const newInvite = invites[member.guild.id].find(invite => invite.uses !== dbInvites[invite.code]);
                const inviter = newInvite.inviter ? client.users.cache.get(newInvite.inviter.id) : null;
                const embed = new MessageEmbed()
                    .setTitle("New Member Joined!")
                    .setDescription(`<@${member.user.id}> has joined the server. ${inviter ? `They were invited by <@${inviter.id}>.` : 'We could not determine who invited them.'}`)
                    .setColor("#32CD32");
                const channelId = await getInviteChannelId(member.guild.id);
                const channel = member.guild.channels.cache.get(channelId);
                if (channel) channel.send({ embeds: [embed] });
            });
        });

        client.on('inviteCreate', async invite => {
            console.log(`Invite created: ${invite.code}`);
            if (!invites[invite.guild.id]) {
                await fetchInvites(invite.guild);
            } else {
                invites[invite.guild.id].set(invite.code, invite);
                updateInviteInDb(invite.guild.id, invite.code, invite.uses, invite.inviter ? invite.inviter.id : null);
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

async function getInviteChannelId(guildId) {
    return new Promise((resolve, reject) => {
        db.query(`
            SELECT channelId
            FROM inviteChannels
            WHERE guildId = ?
        `, [guildId], function (error, results) {
            if (error) return reject(error);
            if (results.length > 0) resolve(results[0].channelId);
            else resolve(null);
        });
    });
}
