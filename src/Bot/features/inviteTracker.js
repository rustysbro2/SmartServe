const path = require("path");
const dotenv = require("dotenv");
const { EmbedBuilder } = require("discord.js");
const { pool } = require("../../database.js");

const envPath = path.join(__dirname, "..", "..", ".env");
dotenv.config({ path: envPath }); // Load environment variables from .env file

let invites = {};

async function fetchInvites(guild) {
  try {
    const guildInvites = await guild.invites.fetch();
    invites[guild.id] = guildInvites;
    guildInvites.forEach((invite) =>
      updateInviteInDb(
        guild.id,
        invite.code,
        invite.uses,
        invite.inviter ? invite.inviter.id : null,
      ),
    );
  } catch (error) {
    console.error(`Error fetching invites for guild ${guild.name}:`, error);
  }
}

function updateInviteInDb(guildId, code, uses, inviterId) {
  pool.query(
    `
    INSERT INTO invites (guildId, code, uses, inviterId)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    uses = VALUES(uses),
    inviterId = VALUES(inviterId)
  `,
    [guildId, code, uses, inviterId],
    function (error) {
      if (error) throw error;
    },
  );
}

module.exports = {
  name: "inviteTracker",
  execute(client) {
    client.guilds.cache.forEach((guild) => {
      fetchInvites(guild);
    });

    client.on("guildCreate", (guild) => {
      fetchInvites(guild);
      console.log(`Bot joined a new guild: ${guild.name}`);
    });

    client.on("guildMemberAdd", async (member) => {
      console.log(`New member added: ${member.user.tag}`);
      pool.query(
        `
        SELECT *
        FROM invites
        WHERE guildId = ?
      `,
        [member.guild.id],
        async function (error, dbInvites) {
          if (error) throw error;
          const newInvite = invites[member.guild.id].find(
            (invite) => invite.uses !== dbInvites[invite.code],
          );
          let joinMethod = "";
          let inviter = null;
          if (newInvite) {
            inviter = newInvite.inviter
              ? client.users.cache.get(newInvite.inviter.id)
              : null;
            joinMethod = `They were invited by <@${inviter.id}>.`;
          } else {
            if (member.user.bot) {
              joinMethod = "They joined via OAuth2.";
            } else {
              joinMethod =
                "They likely used a Vanity URL or an invite that was later deleted.";
            }
          }

          const exampleEmbed = new EmbedBuilder()
            .setTitle(member.user.bot ? "Bot Joined!" : "New Member Joined!")
            .setDescription(
              `<@${member.user.id}> has joined the server. ${joinMethod}`,
            )
            .setColor(0x32cd32);

          const channelId = await getInviteChannelId(member.guild.id);
          const channel = member.guild.channels.cache.get(channelId);
          if (channel) channel.send({ embeds: [exampleEmbed] });
        },
      );
    });

    client.on("inviteCreate", async (invite) => {
      console.log(`Invite created: ${invite.code}`);
      if (!invites[invite.guild.id]) {
        await fetchInvites(invite.guild);
      } else {
        invites[invite.guild.id].set(invite.code, invite);
        updateInviteInDb(
          invite.guild.id,
          invite.code,
          invite.uses,
          invite.inviter ? invite.inviter.id : null,
        );
      }
    });

    client.on("inviteDelete", async (invite) => {
      console.log(`Invite deleted: ${invite.code}`);
      const cachedInvites = invites[invite.guild.id];
      cachedInvites.delete(invite.code);
    });
  },

  setInviteChannel(guildId, channelId) {
    console.log(`Setting invite channel: ${channelId} for guild: ${guildId}`);
    pool.query(
      `
      INSERT INTO inviteChannels (guildId, channelId)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
      channelId = VALUES(channelId)
    `,
      [guildId, channelId],
      function (error) {
        if (error) throw error;
      },
    );
  },
};

async function getInviteChannelId(guildId) {
  return new Promise((resolve, reject) => {
    pool.query(
      `
      SELECT channelId
      FROM inviteChannels
      WHERE guildId = ?
    `,
      [guildId],
      function (error, results) {
        if (error) return reject(error);
        if (results.length > 0) resolve(results[0].channelId);
        else resolve(null);
      },
    );
  });
}
