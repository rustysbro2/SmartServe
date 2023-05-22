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
  console.log(`Tracking user join: ${member.user.tag}`);

  const trackingData = await loadTrackingData();
  let guildData = trackingData[guildId];

  if (!guildData) {
    guildData = {
      inviteMap: {},
    };
  }

  if (member.user.bot) {
    console.log(`Bot joined the server: ${member.user.tag}`);
    return;
  }

  try {
    const oldInvites = guildData.inviteMap;
    const newInvites = await member.guild.invites.fetch();

    console.log(`Fetched invites: ${newInvites.size}`);

    const usedInvite = newInvites.find((newInvite) => {
      const oldInvite = oldInvites[newInvite.code];
      return !oldInvite || oldInvite.uses < newInvite.uses;
    });

    console.log(`Used invite: ${usedInvite}`);

    if (usedInvite) {
      guildData.inviteMap[usedInvite.code] = {
        uses: usedInvite.uses,
        inviter: usedInvite.inviter.id,
      };

      if (guildData.trackingChannelId) {
        const trackingChannel = await member.guild.channels.fetch(guildData.trackingChannelId);

        console.log(`Tracking channel: ${trackingChannel}`);

        if (trackingChannel && trackingChannel.isText()) {
          const inviter = member.guild.members.cache.get(usedInvite.inviter.id);
          if (inviter) {
            trackingChannel.send(`User ${member.user.tag} joined the server. Invited by ${inviter}`);
          } else {
            trackingChannel.send(`User ${member.user.tag} joined the server.`);
          }
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
    console.error(`Failed to fetch invites: ${error}`);
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
