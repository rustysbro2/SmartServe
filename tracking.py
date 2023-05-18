import discord
from discord.ext import commands

class Tracking(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_invite_create(self, invite):
        # Get the tracking channel ID from the data file
        with open('count_data.json', 'r') as f:
            all_data = json.load(f)

        guild_id = str(invite.guild.id)
        data = all_data.get(guild_id)
        if data and data['tracking_channel_id']:
            channel_id = data['tracking_channel_id']

            # Find the tracking channel in the guild
            guild = self.bot.get_guild(invite.guild.id)
            tracking_channel = guild.get_channel(channel_id)

            if tracking_channel:
                inviter = invite.inviter
                tracking_message = f"New invite created by {inviter.mention}: {invite.url}"
                await tracking_channel.send(tracking_message)

    @commands.Cog.listener()
    async def on_member_join(self, member):
        # Get the tracking channel ID from the data file
        with open('count_data.json', 'r') as f:
            all_data = json.load(f)

        guild_id = str(member.guild.id)
        data = all_data.get(guild_id)
        if data and data['tracking_channel_id']:
            channel_id = data['tracking_channel_id']

            # Find the tracking channel in the guild
            guild = self.bot.get_guild(member.guild.id)
            tracking_channel = guild.get_channel(channel_id)

            if tracking_channel:
                inviter = await self.get_inviter(member)
                tracking_message = f"New member joined from {inviter.mention}: {member.mention}"
                await tracking_channel.send(tracking_message)

    async def get_inviter(self, member):
        # Fetch the audit logs for member joins
        logs = await member.guild.audit_logs(limit=10).flatten()
        for log in logs:
            if log.action == discord.AuditLogAction.invite_create and log.target.code == member.guild.me.id:
                return log.user
        return None

def setup(bot):
    bot.add_cog(Tracking(bot))
