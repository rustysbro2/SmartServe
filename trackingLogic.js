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

async function trackUserJoin(guildId, member) {
  const trackingData = loadTrackingData();
  let guildData = trackingData[guildId];

  if (!guildData) {
    guildData = {
      inviteMap: {},
    };
  }

  const trackingChannelId = guildData.trackingChannelId;
  if (trackingChannelId) {
    const trackingChannel = member.guild.channels.cache.get(trackingChannelId);
    if (trackingChannel && trackingChannel.isText()) {
      const inviter = member.inviter || 'Unknown'; // Get the inviter's name or set as 'Unknown' if not available
      trackingChannel.send(`User ${member.user.tag} joined, invited by ${inviter}`);
    }
  }

  trackingData[guildId] = guildData;
  saveTrackingData(trackingData);
}

module.exports = {
  trackUserJoin,
  setTrackingChannel,
};