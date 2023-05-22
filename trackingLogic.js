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
        const trackingChannel = await member.guild.channels.cache.get(guildData.trackingChannelId);

        console.log(`Tracking channel: ${trackingChannel}`);

        if (trackingChannel && trackingChannel.isText()) {
          const inviter = await member.guild.members.fetch(usedInvite.inviter.id);
          if (inviter) {
            console.log(`Sending message in tracking channel: User ${member.user.tag} joined the server. Invited by ${inviter.user.tag}`);
            trackingChannel.send(`User ${member.user.tag} joined the server. Invited by ${inviter.user.tag}`)
              .then(() => {
                console.log('Message sent successfully.');
              })
              .catch((error) => {
                console.error('Error sending message:', error);
              });
          } else {
            console.log(`Sending message in tracking channel: User ${member.user.tag} joined the server.`);
            trackingChannel.send(`User ${member.user.tag} joined the server.`)
              .then(() => {
                console.log('Message sent successfully.');
              })
              .catch((error) => {
                console.error('Error sending message:', error);
              });
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
