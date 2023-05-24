module.exports = (client) => {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const botId = client.user.id;
    const guildId = oldState.guild.id;
    const musicPlayer = client.musicPlayers.get(guildId);

    if (musicPlayer && musicPlayer.connection) {
      const botInChannel = oldState.channelId && oldState.member.id === botId;
      const botAlone = newState.channelId && newState.channel.members.size === 1 && newState.member.id === botId;

      if (botInChannel && !botAlone) {
        console.log(`Other users joined the voice channel: ${newState.channel.name}`);
        console.log(`Channel Members: ${newState.channel.members.size}`);
      }

      if (botInChannel && botAlone) {
        console.log(`Bot is the only member in the voice channel: ${newState.channel.name}`);
        console.log(`Channel Members: ${newState.channel.members.size}`);
        console.log("Destroying connection and leaving voice channel.");
        musicPlayer.connection.destroy();
        client.musicPlayers.delete(guildId);
      }
    }
  });
};
