const fs = require('fs');
const mysql = require('mysql2');

const connectionConfig = {
  host: 'localhost',
  user: 'rustysbro',
  password: '1234',
  database: 'counting'
};

function loadTrackingData() {
  const connection = mysql.createConnection(connectionConfig);

  return new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) {
        console.error('Error connecting to MySQL:', err);
        reject(err);
        return;
      }

      const query = 'SELECT * FROM tracking_data';
      connection.query(query, (error, results) => {
        if (error) {
          console.error('Error loading tracking data:', error);
          reject(error);
        } else {
          const trackingData = {};
          for (const row of results) {
            trackingData[row.guild_id] = {
              inviteMap: JSON.parse(row.invite_map),
              trackingChannelId: row.tracking_channel_id
            };
          }
          console.log('Tracking data loaded successfully');
          resolve(trackingData);
        }
        connection.end();
      });
    });
  });
}

function saveTrackingData(data) {
  const connection = mysql.createConnection(connectionConfig);

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }

    const values = Object.entries(data).map(([guildId, { inviteMap, trackingChannelId }]) => {
      return `('${guildId}', '${JSON.stringify(inviteMap)}', '${trackingChannelId}')`;
    });

    const query = `INSERT INTO tracking_data (guild_id, invite_map, tracking_channel_id) VALUES ${values} ON DUPLICATE KEY UPDATE invite_map = VALUES(invite_map), tracking_channel_id = VALUES(tracking_channel_id)`;

    connection.query(query, (error, results) => {
      if (error) {
        console.error('Error saving tracking data:', error);
      } else {
        console.log('Tracking data saved successfully');
      }
      connection.end();
    });
  });
}

async function trackUserJoin(guildId, member) {
  const trackingData = await loadTrackingData();
  let guildData = trackingData[guildId];

  if (!guildData) {
    guildData = {
      inviteMap: {},
      trackingChannelId: null
    };
  }

  if (member instanceof GuildMember) {
    const invites = await member.guild.invites.fetch();

    const usedInvite = invites.find((invite) => {
      const inviteData = guildData.inviteMap[invite.code];
      return inviteData && inviteData.uses < invite.uses;
    });

    if (usedInvite) {
      guildData.inviteMap[usedInvite.code] = {
        uses: usedInvite.uses,
        inviter: member.id
      };

      const trackingChannelId = guildData.trackingChannelId;
      if (trackingChannelId) {
        const trackingChannel = member.guild.channels.cache.get(trackingChannelId);
        if (trackingChannel && trackingChannel.isText()) {
          trackingChannel.send(`User ${member.user.tag} joined using invite code ${usedInvite.code}`);
        }
      }
    }
  }

  trackingData[guildId] = guildData;
  saveTrackingData(trackingData);
}

function setTrackingChannel(guildId, channelId) {
  const connection = mysql.createConnection(connectionConfig);

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }

    const query = `UPDATE tracking_data SET tracking_channel_id = '${channelId}' WHERE guild_id = '${guildId}'`;
    connection.query(query, (error, results) => {
      if (error) {
        console.error('Error updating tracking channel:', error);
      } else {
        console.log('Tracking channel updated successfully');
      }
      connection.end();
    });
  });
}

module.exports = {
  loadTrackingData,
  saveTrackingData,
  trackUserJoin,
  setTrackingChannel
};