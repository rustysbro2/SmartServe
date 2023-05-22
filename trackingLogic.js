const mysql = require('mysql');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'Rustysbro',
  password: '1234',
  database: 'counting',
});

function trackUserJoin(guildId, member) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting MySQL connection:', err);
      return;
    }

    const invitesQuery = 'SELECT * FROM invites WHERE guildId = ?';
    connection.query(invitesQuery, [guildId], (err, inviteResults) => {
      if (err) {
        console.error('Error querying invites:', err);
        connection.release();
        return;
      }

      const invites = {};
      for (const inviteResult of inviteResults) {
        invites[inviteResult.code] = {
          uses: inviteResult.uses,
          inviter: inviteResult.inviterId,
        };
      }

      const usedInvite = member.guild.invites.cache.find(
        (invite) => invites[invite.code] && invites[invite.code].uses < invite.uses
      );

      if (usedInvite) {
        const trackingChannelId = 'YOUR_TRACKING_CHANNEL_ID';
        const trackingChannel = member.guild.channels.cache.get(trackingChannelId);
        if (trackingChannel && trackingChannel.isText()) {
          trackingChannel.send(`User ${member.user.tag} joined using invite code ${usedInvite.code}`);
        }
      }

      connection.release();
    });
  });
}

module.exports = {
  trackUserJoin,
};