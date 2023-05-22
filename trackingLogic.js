const mysql = require('mysql2/promise');

const connectionConfig = {
  host: 'localhost',
  user: 'rustysbro',
  password: '1234',
  database: 'counting'
};

async function loadTrackingData() {
  try {
    const connection = await mysql.createConnection(connectionConfig);

    const [rows] = await connection.execute('SELECT * FROM tracking_data');
    const trackingData = {};

    for (const row of rows) {
      trackingData[row.guild_id] = {
        inviteMap: JSON.parse(row.invite_map),
        trackingChannelId: row.tracking_channel_id
      };
    }

    console.log('Tracking data loaded successfully');
    return trackingData;
  } catch (error) {
    console.error('Error loading tracking data:', error);
    throw error;
  }
}

async function saveTrackingData(data) {
  try {
    const connection = await mysql.createConnection(connectionConfig);

    const values = Object.entries(data).map(([guildId, { inviteMap, trackingChannelId }]) => {
      return `('${guildId}', '${JSON.stringify(inviteMap)}', '${trackingChannelId}')`;
    });

    const query = `INSERT INTO tracking_data (guild_id, invite_map, tracking_channel_id) VALUES ${values} ON DUPLICATE KEY UPDATE invite_map = VALUES(invite_map), tracking_channel_id = VALUES(tracking_channel_id)`;

    await connection.execute(query);
    console.log('Tracking data saved successfully');
  } catch (error) {
    console.error('Error saving tracking data:', error);
    throw error;
  }
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
  await saveTrackingData(trackingData);
}

async function setTrackingChannel(guildId, channelId) {
  try {
    const connection = await mysql.createConnection(connectionConfig);

    const query = `UPDATE tracking_data SET tracking_channel_id = '${channelId}' WHERE guild_id = '${guildId}'`;
    await connection.execute(query);

    console.log('Tracking channel updated successfully');
  } catch (error) {
    console.error('Error updating tracking channel:', error);
    throw error;
  }
}

module.exports = {
  loadTrackingData,
  saveTrackingData,
  trackUserJoin,
  setTrackingChannel
};
