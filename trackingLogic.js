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

  if (member instanceof GuildMember) {
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

      const trackingChannelId = guildData.trackingChannelId;
      if (trackingChannelId) {
        const trackingChannel = member.guild.channels.cache.get(trackingChannelId);
        if (trackingChannel && trackingChannel.isText()) {
          console.log(`Sending message to tracking channel: ${trackingChannel.name}`);
          try {
            await trackingChannel.send(`User ${member.user.tag} joined using invite code ${usedInvite.code}`);
            console.log(`Message sent successfully.`);
          } catch (error) {
            console.error(`Error sending message:`, error);
          }
        } else {
          console.error(`Invalid tracking channel:`, trackingChannel);
        }
      } else {
        console.error(`Tracking channel ID not set for guild ${guildId}`);
      }
    } else {
      console.error(`No used invite found for member ${member.user.tag}`);
    }
  }

  trackingData[guildId] = guildData;
  saveTrackingData(trackingData);
}