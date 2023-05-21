const fs = require('fs');

// Function to load tracking data from the file
function loadTrackingData() {
  try {
    const data = fs.readFileSync('trackingData.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File does not exist, create an empty file
      fs.writeFileSync('trackingData.json', '{}', 'utf8');
      return {};
    }
    throw error;
  }
}

// Function to save tracking data to the file
function saveTrackingData(data) {
  const jsonData = JSON.stringify(data, null, 2); // Add indentation of 2 spaces
  fs.writeFileSync('trackingData.json', jsonData, { encoding: 'utf8', flag: 'w' });
}

// Function to track user join
function trackUserJoin(guildId, member) {
  const trackingData = loadTrackingData();

  // Get the tracking data for the guild
  let guildData = trackingData[guildId];

  // If tracking data doesn't exist for the guild, create a new object
  if (!guildData) {
    guildData = {
      inviteMap: {},
    };
  }

  // Retrieve the invite code used to join the guild
  const inviteCode = member.guild.fetchInvites()
    .then((invites) => {
      // Find the invite used by the member
      const usedInvite = invites.find((invite) => {
        const inviteData = guildData.inviteMap[invite.code];
        if (inviteData && inviteData.uses < invite.uses) {
          return true;
        }
        return false;
      });

      // If the used invite is found, update the tracking data
      if (usedInvite) {
        guildData.inviteMap[usedInvite.code] = {
          uses: usedInvite.uses,
          inviter: member.id,
        };

        // Send a message in the tracking channel
        if (guildData.trackingChannelId) {
          const trackingChannel = member.guild.channels.cache.get(guildData.trackingChannelId);
          if (trackingChannel && trackingChannel.isText()) {
            trackingChannel.send(`User ${member.user.tag} joined using invite code ${usedInvite.code}`);
          }
        }
      }
    })
    .catch(console.error);

  // Update the tracking data for the guild
  trackingData[guildId] = guildData;

  // Save the updated tracking data
  saveTrackingData(trackingData);
}

// Function to set the tracking channel
function setTrackingChannel(guildId, channelId) {
  const trackingData = loadTrackingData();

  // Get the tracking data for the guild
  let guildData = trackingData[guildId];

  // If tracking data doesn't exist for the guild, create a new object
  if (!guildData) {
    guildData = {
      inviteMap: {},
      trackingChannelId: null,
    };
    trackingData[guildId] = guildData; // Associate guild ID with tracking data
  }

  // Check if the channel ID already exists
  if (guildData.trackingChannelId === channelId) {
    return; // No need to update if the channel ID is the same
  }

  // Set the tracking channel ID for the guild
  guildData.trackingChannelId = channelId;

  // Save the updated tracking data
  saveTrackingData(trackingData);
}



module.exports = {
  trackUserJoin,
  setTrackingChannel
};
