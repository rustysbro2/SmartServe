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

        client.on('guildMemberAdd', async member => {
            console.log(`New member added: ${member.user.tag}`);

            db.query(`
                SELECT channelId
                FROM inviteChannels
                WHERE guildId = ?
            `, [member.guild.id], async function (error, results) {
                if (error) throw error;
                if (results.length > 0) {
                    const channelId = results[0].channelId;
                    const channel = member.guild.channels.cache.get(channelId);
                    if (!channel) return;

                    let embed;
                    if (member.user.bot) {
                        embed = new MessageEmbed()
                            .setTitle("New Bot Joined!")
                            .setDescription(`${member.user.tag} joined through OAuth.`)
                            .setColor("#32CD32");
                    } else {
                        const newGuildInvites = await member.guild.invites.fetch();
                        const oldGuildInvites = invites[member.guild.id];
                        const usedInvite = oldGuildInvites.find(inv => newGuildInvites.get(inv.code).uses > inv.uses);

                        if (usedInvite) {
                            const inviter = member.guild.members.cache.get(usedInvite.inviter.id);
                            embed = new MessageEmbed()
                                .setTitle("New Member Joined!")
                                .setDescription(`${member.user.tag} joined using invite code ${usedInvite.code} from ${inviter.user.tag}. Total uses: ${usedInvite.uses}`)
                                .setColor("#32CD32");
                        } else {
                            // Here we handle the case where we can't determine the invite used
                            const isVanity = await member.guild.fetchVanityData().catch(() => false);
                            if (isVanity) {
                                embed = new MessageEmbed()
                                    .setTitle("New Member Joined!")
                                    .setDescription(`${member.user.tag} joined using the vanity URL.`)
                                    .setColor("#32CD32");
                            } else {
                                embed = new MessageEmbed()
                                    .setTitle("New Member Joined!")
                                    .setDescription(`${member.user.tag} joined, but we couldn't determine the invite used.`)
                                    .setColor("#32CD32");
                            }
                        }
                    }
                    channel.send({ embeds: [embed] });
                }
            });
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
