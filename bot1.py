import discord
from discord_slash import SlashCommand
from discord_slash.utils.manage_commands import create_option

bot = discord.Bot(intents=discord.Intents.default())
slash = SlashCommand(bot, sync_commands=True)  # Declares slash commands through the bot.

guild_ids = [1100765844776173670]  # Put your server IDs in this array.

count = 0

@slash.slash(name="count",
             description="Increases the count by 1",
             options=[
               create_option(
                 name="user",
                 description="Who is counting?",
                 option_type=6,
                 required=True
               )],
             guild_ids=guild_ids)
async def _count(ctx, user: discord.Member):  # Defines a new "context" (ctx) command called "count".
    global count
    count += 1
    await ctx.send(f"{user.mention} increased the count to {count}!", hidden=False)






bot.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY')
