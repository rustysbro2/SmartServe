import discord
from discord.ext import commands
import json

class Tracking(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_member_join(self, member):
        guild = member.guild

        # Load existing invite data from the JSON file
        with open('invite_data.json', 'r') as f:
            all_data = json.load(f)

        # Retrieve the invites for the guild
        invites = await guild.invites()

        # Find the invite that matches the member's join
        for invite in invites:
            if invite.inviter == member:
                inviter = invite.inviter
                invite_code = invite.code
                invite_type = self.get_invite_type(invite)

                print(f"{member.name}#{member.discriminator} has joined the server {guild.name} and was invited by {inviter.name}#{inviter.discriminator} (Invite Type: {invite_type}, Invite Code: {invite_code})")
                break

    def get_invite_type(self, invite):
        if invite.max_uses == 0 and invite.max_age == 0 and invite.temporary:
            return "Vanity"
        elif invite.max_uses == 0 and invite.max_age == 0 and not invite.temporary:
            return "Permanent Instant Invite"
        elif invite.max_uses > 0 and invite.max_age == 0 and not invite.temporary:
            return "Permanent Invite"
        else:
            return "Temporary Invite"

def setup(bot):
    bot.add_cog(Tracking(bot))
