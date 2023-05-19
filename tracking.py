import discord
from discord.ext import commands
import json
import random

class Tracking(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.data_file = 'invite_data.json'
        self.default_data = {
            'channel_id': None
        }

    @commands.Cog.listener()
    async def on_member_join(self, member):
        guild = member.guild

        # Load existing data from the JSON file
        all_data = self.load_data()

        # Retrieve the designated channel for join messages
        channel_id = all_data.get(str(guild.id), {}).get('channel_id')
        if channel_id:
            channel = self.bot.get_channel(channel_id)
            if channel:
                message = f"{member.mention} has joined the server!"

                # Retrieve the inviter's information
                try:
                    inviter_id = await self.get_inviter_id(member)
                    if inviter_id:
                        inviter = guild.get_member(inviter_id)
                        if inviter:
                            message += f" Invited by {inviter.mention}"
                except discord.Forbidden:
                    pass  # Bot lacks 'Manage Server' permission

                sent_message = await channel.send(message)
                emoji = random.choice(self.get_positive_emojis())
                await sent_message.add_reaction(emoji)

    async def get_inviter_id(self, member):
        invites = await member.guild.invites()
        for invite in invites:
            if invite.uses > 0 and invite.inviter and not invite.inviter.bot:
                return invite.inviter.id
        return None

    def get_positive_emojis(self):
        positive_emojis = [
            "😊", "😄", "🌟", "🎉", "👍", "🌞", "💖", "🌈", "🤗", "🥳",
            "👏", "🥰", "✨", "😁", "🌻", "🥇", "🌺", "💯", "🙌", "🔥",
            "💪", "🎊", "🌼", "🎈", "🍀", "🎇", "👌", "💃", "🌹", "🌞",
            "🥇", "🌠", "💥", "🎁", "🎶", "🚀", "🍾", "🌄", "🎆", "🌻",
            "🎨", "💓", "💫", "🍻", "🍬", "🌿", "💐", "🔆", "🌸", "🌺"
        ]
        return positive_emojis

    @commands.command()
    @commands.has_permissions(administrator=True)
    async def set_join_channel(self, ctx, channel: discord.TextChannel):
        guild = ctx.guild

        # Load existing data from the JSON file
        all_data = self.load_data()

        # Update the join channel ID for the guild
        all_data[str(guild.id)] = {
            'channel_id': channel.id
        }
        self.save_data(all_data)

        await ctx.send(f"The join channel has been set to {channel.mention}")

    def load_data(self):
        try:
            with open(self.data_file, 'r') as f:
                all_data = json.load(f)
        except FileNotFoundError:
            all_data = {}
        return all_data

    def save_data(self, all_data):
        with open(self.data_file, 'w') as f:
            json.dump(all_data, f, indent=4)

@bot.event
async def on_ready():
    tracking_cog = Tracking(bot)  # Create an instance of the Tracking cog
    bot.add_cog(tracking_cog)


