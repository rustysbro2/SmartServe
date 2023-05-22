const mysql = require('mysql2');
const { GuildMember } = require('discord.js');

const connectionConfig = {
  host: 'localhost',
  user: 'rustysbro',
  password: '1234',
  database: 'counting'
};

function createTable() {
  const connection = mysql.createConnection(connectionConfig);

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }

    const query = `
      CREATE TABLE IF NOT EXISTS tracking_data (
        guild_id VARCHAR(255) PRIMARY KEY,
        invite_map TEXT,
        tracking_channel_id VARCHAR(255)
      )
    `;

    connection.query(query, (error, results) => {
      if (error) {
        console.error('Error creating tracking_data table:', error);
      } else {
        console.log('tracking_data table created successfully');
      }
      connection.end();
    });
  });
}

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
      const inviteKey = invite.code || invite.url; // Use invite code or URL as the key
      const inviteData = guildData.inviteMap[inviteKey];
      return inviteData && inviteData.inviter !== member.id;
    });

    if (usedInvite) {
      const inviteKey = usedInvite.code || usedInvite.url; // Use invite code or URL as the key
      guildData.inviteMap[inviteKey] = {
        inviter: usedInvite.inviter.id
      };

      const trackingChannelId = guildData.trackingChannelId;
      if (trackingChannelId) {
        const trackingChannel = member.guild.channels.cache.get(trackingChannelId);
        if (trackingChannel && trackingChannel.isText()) {
          trackingChannel.send(`User ${member.user.tag} joined using invite ${inviteKey}`)
            .then(() => {
              console.log('Tracking message sent successfully');
            })
            .catch((error) => {
              console.error('Error sending tracking message:', error);
            });
        } else {
          console.log('Tracking channel not found or not a text channel');
        }
      } else {
        console.log('No tracking channel set');
      }
    } else {
      console.log('No valid invite found');
    }
  } else {
    console.log('Member is not an instance of GuildMember');
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

// Create the table on startup
createTable();

module.exports = {
  loadTrackingData,
  saveTrackingData,
  trackUserJoin,
  setTrackingChannel
};
