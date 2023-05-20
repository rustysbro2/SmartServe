import discord
from discord.ext import commands
import random
import re
import datetime

class Giveaway(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    @commands.has_permissions(administrator=True)
    async def giveaway(self, ctx, duration: str, winners: int, *, prize: str):
        print("Giveaway command invoked")
        print(f"Duration: {duration}")
        print(f"Winners: {winners}")
        print(f"Prize: {prize}")

        duration_seconds = parse_duration(duration)
        if duration_seconds is None:
            await ctx.send("Invalid duration format. Please use a valid format such as '10d' or '3h'.")
            return

        giveaway_message = await ctx.send(f"🎉 **GIVEAWAY** 🎉\n\nPrize: {prize}\nDuration: {duration}\nWinners: {winners}\n\nReact with 🎉 to enter!")
        print("Giveaway message sent")

        await giveaway_message.add_reaction("🎉")
        print("Giveaway reaction added")

        await discord.utils.sleep_until(giveaway_message.created_at + datetime.timedelta(seconds=duration_seconds))
        print("Giveaway duration elapsed")

        giveaway_message = await ctx.channel.fetch_message(giveaway_message.id)
        print("Giveaway message fetched")

        reaction = discord.utils.get(giveaway_message.reactions, emoji="🎉")
        participants = await reaction.users().flatten()
        participants.remove(self.bot.user)
        print("Participants collected")

        if len(participants) < winners:
            await ctx.send("Not enough participants entered the giveaway. Giveaway canceled.")
            print("Giveaway canceled")
            return

        giveaway_winners = random.sample(participants, winners)
        print("Giveaway winners selected")

        winner_mentions = " ".join([winner.mention for winner in giveaway_winners])
        await ctx.send(f"🎉 **GIVEAWAY WINNERS** 🎉\n\nPrize: {prize}\nWinners: {winner_mentions}")
        print("Giveaway winners announced")

def parse_duration(duration):
    duration_regex = r"(\d+)([smhdw])"
    match = re.findall(duration_regex, duration)
    if not match:
        return None

    seconds = 0
    for value, unit in match:
        value = int(value)
        if unit == 's':
            seconds += value
        elif unit == 'm':
            seconds += value * 60
        elif unit == 'h':
            seconds += value * 3600
        elif unit == 'd':
            seconds += value * 86400
        elif unit == 'w':
            seconds += value * 604800

    return seconds

def setup(bot):
    bot.add_cog(Giveaway(bot))
