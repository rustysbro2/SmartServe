const fs = require('fs');
const { GuildMember } = require('discord.js');

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

async function trackUserJoin(member) {
  console.log('Tracking user join:', member.user.tag);
  const trackingData = loadTrackingData();
  const guildData = trackingData[member.guild.id] || { inviteMap: {} };

  if (member instanceof GuildMember) {
    const invites = await member.guild.invites.fetch();

    const usedInvite = invites.find((invite) => {
      const inviteData = guildData.inviteMap[invite.code];
      return inviteData && inviteData.uses < invite.uses;
    });

    if (usedInvite) {
      console.log(`User joined using invite code ${usedInvite.code}`);
      guildData.inviteMap[usedInvite.code] = {
        uses: usedInvite.uses,
        inviter: member.id,
      };

      const trackingChannelId = guildData.trackingChannelId;
      if (trackingChannelId) {
        const trackingChannel = member.guild.channels.cache.get(trackingChannelId);
        if (trackingChannel && trackingChannel.isText()) {
          console.log('Sending tracking message...');
          trackingChannel.send(`User ${member.user.tag} joined using invite code ${usedInvite.code}`);
        } else {
          console.log('Tracking channel not found or is not a text channel');
        }
      } else {
        console.log('Tracking channel ID not set');
      }
    } else {
      console.log('No used invite found for the user');
    }
  }

  trackingData[member.guild.id] = guildData;
  saveTrackingData(trackingData);
}

function setTrackingChannel(guildId, channelId) {
  console.log(`Setting tracking channel for guild ID ${guildId} to channel ID ${channelId}`);
  const trackingData = loadTrackingData();
  let guildData = trackingData[guildId];

  if (!guildData) {
    guildData = {
      inviteMap: {},
      trackingChannelId: null,
    };
  }

  guildData.trackingChannelId = channelId;
  saveTrackingData(trackingData);
}

module.exports = {
  trackUserJoin,
  setTrackingChannel,
};