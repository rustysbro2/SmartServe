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
    if (member.user.bot && member.user.id !== '1105598736551387247') {
      // Bot joined the server
      const inviterId = await getInviterId(member);

      if (inviterId) {
        const inviter = member.guild.members.cache.get(inviterId);

        if (guildData.trackingChannelId) {
          const trackingChannel = await member.guild.channels.fetch(guildData.trackingChannelId);

          if (trackingChannel && trackingChannel.isText()) {
            trackingChannel.send(`Bot ${member.user.tag} joined the server, invited by ${inviter}`);
          }
        }
      }
    } else {
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
            trackingChannel.send(`User ${member.user.tag} joined using invite code ${usedInvite.code}`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to fetch invites: ${error}`);
  }

  trackingData[guildId] = guildData;
  await saveTrackingData(trackingData);
}

async function getInviterId(member) {
  const invites = await member.guild.invites.fetch();
  for (const invite of invites.values()) {
    if (invite.uses > 0 && invite.inviter && !invite.inviter.bot) {
      return invite.inviter.id;
    }
  }
  return null;
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
