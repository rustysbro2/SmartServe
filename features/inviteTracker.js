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
            // Send a message to the guild's default channel (usually the channel with the ID that matches the guild ID)
            let defaultChannel = "";
            guild.channels.cache.forEach((channel) => {
                if(channel.type == "text" && defaultChannel == "") {
                    if(channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
                        defaultChannel = channel;
                    }
                }
            })
            //defaultChannel will be the channel object that it first finds the bot has permissions for
            defaultChannel.send(`Hello, I'm your new bot!`).catch(console.error);
        });

        
        client.on('guildMemberUpdate', async (oldMember, newMember) => {
            if (newMember.user.bot) {
                // Fetch the invite channel for this guild from the database
                db.query(`
                    SELECT channelId
                    FROM inviteChannels
                    WHERE guildId = ?
                `, [newMember.guild.id], async function (error, results) {  // Make this callback async
                    if (error) throw error;
                    if (results.length > 0) {
                        const channelId = results[0].channelId;
                        const channel = newMember.guild.channels.cache.get(channelId);
                        if (!channel) return;

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
