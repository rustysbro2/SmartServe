// features/inviteTracker.js
const db = require('../database.js');
const { MessageEmbed } = require('discord.js');

let invites = {};

async function fetchInvites(guild) {
    const guildInvites = await guild.invites.fetch();
    invites[guild.id] = guildInvites;
    guildInvites.forEach(invite => {
        updateInviteInDb(guild.id, invite.code, invite.uses);
    });
}

function updateInviteInDb(guildId, inviteCode, uses) {
    db.query(`
        INSERT INTO invites (guildId, inviteCode, uses)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
        uses = VALUES(uses)
    `, [guildId, inviteCode, uses], function (error) {
        if (error) throw error;
    });
}

db.query(`
    CREATE TABLE IF NOT EXISTS inviteChannels (
        guildId VARCHAR(255) PRIMARY KEY,
        channelId VARCHAR(255)
    )
`, function (error) {
    if (error) throw error;
});

db.query(`
    CREATE TABLE IF NOT EXISTS invites (
        guildId VARCHAR(255),
        inviteCode VARCHAR(255),
        uses INT,
        PRIMARY KEY(guildId, inviteCode)
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
            let dbInvites;
            db.query(`
                SELECT *
                FROM invites
                WHERE guildId = ?
            `, [member.guild.id], async function (error, results) {
                if (error) throw error;
                dbInvites = results.reduce((obj, row) => {
                    obj[row.inviteCode] = row.uses;
                    return obj;
                }, {});

                const newInvite = invites[member.guild.id].find(invite => invite.uses !== dbInvites[invite.code]);
                if (!newInvite) {
                    let msg;
                    if (member.user.bot) {
                        msg = `New member joined: ${member.user.tag}, but we couldn't determine the invite used. (likely OAuth)`;
                    } else {
                        msg = `New member joined: ${member.user.tag}, but we couldn't determine the invite used. (likely Vanity URL or other special invite)`;
                    }
                    console.log(msg);
                    return;
                }
                console.log(`New member: ${member.user.tag} used invite: ${newInvite.code}`);
                updateInviteInDb(member.guild.id, newInvite.code, newInvite.uses);

                const inviter = client.users.cache.get(newInvite.inviter.id);
                db.query(`
                    SELECT channelId
                    FROM inviteChannels
                    WHERE guildId = ?
                `, [member.guild.id], function (error, results) {
                    if (error) throw error;
                    if (results.length === 0) return;

                    const channelId = results[0].channelId;
                    const channel = client.channels.cache.get(channelId);
                    if (!channel) return;
                    const embed = new MessageEmbed()
                        .setTitle('New Member Joined!')
                        .setDescription(`${member.user.tag} joined using invite code ${newInvite.code} from ${inviter.tag}. Invite was used ${newInvite.uses} times.`)
                        .setTimestamp()
                        .setColor('GREEN');

                    channel.send({ embeds: [embed] });
                });
            });
        });

        client.on('inviteCreate', async invite => {
            console.log(`Invite created: ${invite.code}`);
            if (!invites[invite.guild.id]) {
                await fetchInvites(invite.guild);
            } else {
                invites[invite.guild.id].set(invite.code, invite);
                updateInviteInDb(invite.guild.id, invite.code, invite.uses);
            }
        });

        client.on('inviteDelete', async invite => {
            console.log(`Invite deleted: ${invite.code}`);
            invites[invite.guild.id].delete(invite.code);
            db.query(`
                DELETE FROM invites
                WHERE guildId = ? AND inviteCode = ?
            `, [invite.guild.id, invite.code], function (error) {
                if (error) throw error;
            });
        });
    },
};
