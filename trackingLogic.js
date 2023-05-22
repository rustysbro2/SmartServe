const fs = require('fs');

function loadTrackingData() {
  try {
    const data = fs.readFileSync('trackingData.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      fs.writeFileSync('trackingData.json', '{}', 'utf8');
      return {};
    }
    throw error;
  }
}

function saveTrackingData(data) {
  const jsonData = JSON.stringify(data, null, 2);
  fs.writeFileSync('trackingData.json', jsonData, { encoding: 'utf8', flag: 'w' });
}

function trackUserJoin(guildId, member) {
  const trackingData = loadTrackingData();
  let guildData = trackingData[guildId];

  if (!guildData) {
    guildData = {
      inviteMap: {},
    };
  }

  member.guild.fetchInvites()
    .then(invites => {
      const usedInvite = invites.find(invite => {
        const inviteData = guildData.inviteMap[invite.code];
        if (inviteData && inviteData.uses < invite.uses) {
          return true;
        }
        return false;
      });

      if (usedInvite) {
        guildData.inviteMap[usedInvite.code] = {
          uses: usedInvite.uses,
          inviter: member.id,
        };

        if (guildData.trackingChannelId) {
          const trackingChannel = member.guild.channels.cache.get(guildData.trackingChannelId);
          if (trackingChannel && trackingChannel.isText()) {
            trackingChannel.send(`User ${member.user.tag} joined using invite code ${usedInvite.code}`);
          }
        }
      }
    })
    .catch(console.error);

  trackingData[guildId] = guildData;
  saveTrackingData(trackingData);
}

function setTrackingChannel(guildId, channelId) {
  const trackingData = loadTrackingData();
  let guildData = trackingData[guildId];

  if (!guildData) {
    guildData = {
      inviteMap: {},
      trackingChannelId: null,
    };
    trackingData[guildId] = guildData;
  }

  if (guildData.trackingChannelId === channelId) {
    return;
  }

  guildData.trackingChannelId = channelId;
  saveTrackingData(trackingData);
}

module.exports = {
  trackUserJoin,
  setTrackingChannel
};
