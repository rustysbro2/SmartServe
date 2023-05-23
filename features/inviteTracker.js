// features/inviteTracker.js
const db = require('../database.js');

let invites = {};

async function fetchInvites(guild) {
    const guildInvites = await guild.invites.fetch();
    invites[guild.id] = guildInvites;
}

module.exports = {
    name: 'inviteTracker',
    async execute(client) {
        client.guilds.cache.forEach(guild => fetchInvites(guild));
        
        client.on('guildMemberAdd', async member => {
            const cachedInvites = invites[member.guild.id];
            const newInvites = await member.guild.invites.fetch();

            newInvites.forEach(invite => {
                const oldInvite = cachedInvites.get(invite.code);
                if (oldInvite?.uses < invite.uses) {
                    db.query('INSERT INTO invites (code, inviter, uses) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE uses = ?', 
                        [invite.code, invite.inviter.id, invite.uses, invite.uses], 
                        function (error) {
                            if (error) throw error;
                        });
                }
            });

            invites[member.guild.id] = newInvites;
        });
    },
};
