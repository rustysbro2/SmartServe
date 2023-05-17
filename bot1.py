import discord
from discord.ext import commands
from discord_slash import SlashContext
from discord_slash import cog_ext
from discord_slash.utils.manage_commands import create_option

bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())
guild_ids = [1100765844776173670]

count = 0

class Counting(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @cog_ext.cog_slash(name="count", 
                       description="Increases the count by 1", 
                       options=[
                           create_option(
                               name="user",
                               description="Who is counting?",
                               option_type=6,
                               required=True
                           )],
                       guild_ids=guild_ids)
    async def _count(self, ctx: SlashContext, user: discord.Member):  
        global count
        count += 1
        await ctx.send(f"{user.mention} increased the count to {count}!", hidden=False)

bot.add_cog(Counting(bot))







bot.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY')
