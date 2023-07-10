const { handleVoteWebhook } = require('../../features/voteRemind');
const { getJoinMessageChannelFromDatabase, getLeaveMessageChannelFromDatabase } = require('../../../databaseHandlers');

async function handleGuildMemberAdd(member, client) {
  if (member.user.bot) {
    return;
  }

  await checkAndRecordUserVote(member);
}

async function handleInteractionCreate(interaction, client, commandCategories) {
  try {
    console.log('Interaction received:', interaction);

    if (interaction.isStringSelectMenu() && interaction.customId === 'help_category') {
      console.log('Select menu interaction detected');
      const helpCommand = client.commands.get('help'); // Get the help command from client.commands
      if (helpCommand) {
        helpCommand.handleSelectMenu(interaction, commandCategories);
      } else {
        console.log('Help command not found.');
      }
    } else if (interaction.isCommand()) {
      console.log('Command interaction detected');
      const command = client.commands.get(interaction.commandName);
      if (command) {
        console.log(`Executing command: ${command.name}`);
        await command.execute(interaction, client); // Call the execute function of the command
      } else {
        console.log(`Command not found: ${interaction.commandName}`);
      }
    } else {
      console.log('Unknown interaction type:', interaction);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
  }
}





async function handleGuildCreate(guild, client) {
  try {
    console.log(`Bot joined a new guild: ${guild.name} (${guild.id})`);
    const members = await guild.members.fetch();
    members.forEach(async (member) => {
      if (member.user.bot) {
        return;
      }

      await checkAndRecordUserVote(member);
    });

    const joinMessageChannel = await getJoinMessageChannelFromDatabase(guild.id);

    if (!joinMessageChannel) {
      console.log('Join message channel not set in the database.');
      return;
    }

    console.log('Retrieved join message channel:', joinMessageChannel);

    const joinMessage = `The bot has been added to a new guild!\nGuild Name: ${guild.name}\nGuild ID: ${guild.id}`;

    const targetGuild = client.guilds.cache.get(joinMessageChannel.target_guild_id);
    if (!targetGuild) {
      console.log('Target guild not found.');
      return;
    }

    console.log('Target Guild:', targetGuild);

    console.log('Target Guild Channels:');
    targetGuild.channels.cache.forEach((channel) => {
      console.log(`Channel ID: ${channel.id}, Name: ${channel.name}, Type: ${channel.type}`);
    });

    const channel = targetGuild.channels.cache.get(joinMessageChannel.join_message_channel);
    console.log('Target Channel:', channel);
    console.log('Channel Type:', channel?.type);

    if (!channel || channel.type !== 'GUILD_TEXT') {
      console.log('Text channel not found in the target guild.');
      return;
    }

    await channel.send(joinMessage);
    console.log('Join message sent successfully.');
  } catch (error) {
    console.error('Error handling guildCreate event:', error);
  }
}

async function handleGuildDelete(guild, client) {
  try {
    console.log(`Bot left a guild: ${guild.name} (${guild.id})`);

    const leaveMessageChannel = await getLeaveMessageChannelFromDatabase();

    if (!leaveMessageChannel) {
      console.log('Leave message channel not set in the database.');
      return;
    }

    console.log('Retrieved leave message channel:', leaveMessageChannel);

    const leaveMessage = `The bot has been removed from a guild!\nGuild Name: ${guild.name}\nGuild ID: ${guild.id}`;

    const targetGuild = client.guilds.cache.get(leaveMessageChannel.target_guild_id);
    if (!targetGuild) {
      console.log('Target guild not found.');
      return;
    }

    console.log('Target Guild:', targetGuild);

    console.log('Target Guild Channels:');
    targetGuild.channels.cache.forEach((channel) => {
      console.log(`Channel ID: ${channel.id}, Name: ${channel.name}, Type: ${channel.type}`);
    });

    const channel = targetGuild.channels.cache.get(leaveMessageChannel.leave_message_channel);
    console.log('Target Channel:', channel);
    console.log('Channel Type:', channel?.type);

    if (!channel || channel.type !== 'GUILD_TEXT') {
      console.log('Text channel not found in the target guild.');
      return;
    }

    await channel.send(leaveMessage);
    console.log('Leave message sent successfully.');
  } catch (error) {
    console.error('Error handling guildDelete event:', error);
  }
}

module.exports = { handleVoteWebhook, handleGuildMemberAdd, handleInteractionCreate, handleGuildCreate, handleGuildDelete };
