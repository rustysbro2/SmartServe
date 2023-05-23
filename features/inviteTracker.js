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
        client.guilds.cache.forEach(guild => {
            fetchInvites(guild);
        });
        
        client.on('guildCreate', guild => {
            fetchInvites(guild);
        });
        
        client.on('guildMemberAdd', async member => {
            const cachedInvites = invites[member.guild.id];
            const newInvites = await member.guild.invites.fetch();

            newInvites.forEach(invite => {
                if (cachedInvites.get(invite.code).uses < invite.uses) {
                    const channelId = inviteChannels[member.guild.id];
                    const channel = member.guild.channels.cache.get(channelId);
                    const embed = new MessageEmbed()
                        .setTitle("New Member Joined!")
                        .setDescription(`${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Code used ${invite.uses} times.`)
                        .setColor("#32CD32");
                    channel.send({ embeds: [embed] });
                }
            });

            invites[member.guild.id] = newInvites;
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
        inviteChannels[guildId] = channelId;
    }
};
