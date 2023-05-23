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
        });
        
        client.on('guildMemberAdd', async member => {
            // Fetch the invite channel for this guild from the database
            db.query(`
                SELECT channelId
                FROM inviteChannels
                WHERE guildId = ?
            `, [member.guild.id], function (error, results) {
                if (error) throw error;
                if (results.length > 0) {
                    const channelId = results[0].channelId;
                    const channel = member.guild.channels.cache.get(channelId);
                    if (!channel) return;

                    const cachedInvites = invites[member.guild.id];
                    const newInvites = await member.guild.invites.fetch();

                    newInvites.forEach(invite => {
                        if (cachedInvites.get(invite.code).uses < invite.uses) {
                            const embed = new MessageEmbed()
                                .setTitle("New Member Joined!")
                                .setDescription(`${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Code used ${invite.uses} times.`)
                                .setColor("#32CD32");
                            channel.send({ embeds: [embed] });
                        }
                    });

                    invites[member.guild.id] = newInvites;
                }
            });
        });

        client.on('inviteCreate', async invite => {
            if (!invites[invite.guild.id]) {
                await fetchInvites(invite.guild);
            } else {
                invites[invite.guild.id].set(invite.code, invite);
            }
        });
        
        client.on('inviteDelete', async invite => {
            const cachedInvites = invites[invite.guild.id];
            cachedInvites.delete(invite.code);
        });
    },
    setInviteChannel(guildId, channelId) {
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
