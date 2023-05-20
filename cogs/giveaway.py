import discord
from discord.ext import commands
import random

class Giveaway(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    @commands.has_permissions(administrator=True)
    async def giveaway(self, ctx, duration: int, winners: int, *, prize: str):
        print("Giveaway command invoked")
        print("Giveaway command invoked")
        print(f"Duration: {duration} minutes")
        print(f"Winners: {winners}")
        print(f"Prize: {prize}")

        giveaway_message = await ctx.send(f"🎉 **GIVEAWAY** 🎉\n\nPrize: {prize}\nDuration: {duration} minutes\nWinners: {winners}\n\nReact with 🎉 to enter!")
        print("Giveaway message sent")

        await giveaway_message.add_reaction("🎉")
        print("Giveaway reaction added")

        await discord.utils.sleep_until(giveaway_message.created_at + discord.timedelta(minutes=duration))
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

def setup(bot):
    bot.add_cog(Giveaway(bot))
