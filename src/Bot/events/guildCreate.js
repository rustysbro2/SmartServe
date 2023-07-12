const { getJoinMessageChannelFromDatabase } = require("../database/database");

async function guildCreateEvent(guild, client) {
  try {
    console.log(`Bot joined a new guild: ${guild.name} (${guild.id})`);

    const members = await guild.members.fetch();
    members.forEach(async (member) => {
      if (member.user.bot) return;
      await checkAndRecordUserVote(member);
    });

    const joinMessageChannel = await getJoinMessageChannelFromDatabase(
      guild.id,
    );
    if (!joinMessageChannel) {
      console.log("Join message channel not set in the database.");
      return;
    }

    const { target_guild_id, join_message_channel } = joinMessageChannel;
    const joinMessage = `The bot has been added to a new guild!\nGuild Name: ${guild.name}\nGuild ID: ${guild.id}`;

    const targetGuild = client.guilds.cache.get(target_guild_id);
    if (!targetGuild) {
      console.log("Target guild not found.");
      return;
    }

    const channel = targetGuild.channels.cache.get(join_message_channel);
    if (!channel || channel.type !== "GUILD_TEXT") {
      console.log("Text channel not found in the target guild.");
      return;
    }

    await channel.send(joinMessage);
    console.log("Join message sent successfully.");
  } catch (error) {
    console.error("Error handling guildCreate event:", error);
  }
}

module.exports = {
  guildCreateEvent,
};
