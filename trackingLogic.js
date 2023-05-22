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

async function saveTrackingData(data) {
  const jsonData = JSON.stringify(data, null, 2);
  fs.writeFileSync('trackingData.json', jsonData, { encoding: 'utf8', flag: 'w' });
}

async function trackUserJoin(guildId, member) {
  const trackingData = await loadTrackingData();
  let guildData = trackingData[guildId];

  if (!guildData) {
    guildData = {
      inviteMap: {},
    };
  }

  try {
    const invites = await member.guild.invites.fetch();

    const usedInvite = invites.find((invite) => {
      const inviteData = guildData.inviteMap[invite.code];
      return inviteData && inviteData.uses < invite.uses;
    });

    if (usedInvite) {
      guildData.inviteMap[usedInvite.code] = {
        uses: usedInvite.uses,
        inviter: member.id,
      };

      if (guildData.trackingChannelId) {
        const trackingChannel = await member.guild.channels.fetch(guildData.trackingChannelId);

        if (trackingChannel && trackingChannel.isText()) {
          trackingChannel.send(`User ${member.user.tag} joined using invite code ${usedInvite.code}`)
            .then(() => {
              console.log('Message sent successfully.');
            })
            .catch((error) => {
              console.error('Error sending message:', error);
            });
        } else {
          console.log('Tracking channel does not exist or is not text-based.');
        }
      } else {
        console.log('Tracking channel ID not set.');
      }
    } else {
      console.log('No used invite found.');
    }
  } catch (error) {
    if (error.message.includes('Missing Access')) {
      console.log('Bot joined the server.');
    } else {
      console.error(`Failed to fetch invites: ${error}`);
    }
  }

  trackingData[guildId] = guildData;
  await saveTrackingData(trackingData);
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
