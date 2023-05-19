import discord
from discord.ext import commands
import random

class Giveaway(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    @commands.has_permissions(administrator=True)
    async def giveaway(self, ctx, duration: int, winners: int, *, prize: str):
        # Send giveaway announcement message
        giveaway_message = await ctx.send(f"🎉 **GIVEAWAY** 🎉\n\nPrize: {prize}\nDuration: {duration} minutes\nWinners: {winners}\n\nReact with 🎉 to enter!")
        await giveaway_message.add_reaction("🎉")

        # Wait for the specified duration
        await discord.utils.sleep_until(giveaway_message.created_at + discord.timedelta(minutes=duration))

        # Fetch the updated giveaway message from the server
        giveaway_message = await ctx.channel.fetch_message(giveaway_message.id)

        # Retrieve all the users who reacted to the giveaway message
        reaction = discord.utils.get(giveaway_message.reactions, emoji="🎉")
        participants = await reaction.users().flatten()
        participants.remove(self.bot.user)

        # Check if enough participants entered the giveaway
        if len(participants) < winners:
            await ctx.send("Not enough participants entered the giveaway. Giveaway canceled.")
            return

        # Randomly select the giveaway winners
        giveaway_winners = random.sample(participants, winners)

        # Announce the winners
        winner_mentions = " ".join([winner.mention for winner in giveaway_winners])
        await ctx.send(f"🎉 **GIVEAWAY WINNERS** 🎉\n\nPrize: {prize}\nWinners: {winner_mentions}")

def setup(bot):
    bot.add_cog(Giveaway(bot))
