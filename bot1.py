import discord
from discord.ext import commands

TOKEN = "MTEwNTU5ODczNjU1MTM4NzI0Nw.Gc2MCb.LXE8ptGi_uQqn0FBzvF461pMBAZUCzyP4nMRtY"


bot = commands.Bot(command_prefix='!')

@bot.event
async def on_ready():
    print(f'{bot.user.name} is ready. Connected as {bot.user.name}')

@bot.command(name='set_channel')
@commands.has_permissions(manage_channels=True)
async def set_counting_channel(ctx, channel: discord.TextChannel):
    # Delete the existing channel
    try:
        await channel.delete(reason="Counting error")
    except discord.errors.NotFound:
        pass

    # Create a new channel with the same name, overwrites, and category
    overwrites = channel.overwrites
    category = channel.category

    try:
        new_channel = await channel.guild.create_text_channel(name=channel.name, overwrites=overwrites, category=category)
        await ctx.send(f"Counting channel has been reset to {new_channel.mention}.")
    except discord.errors.HTTPException:
        await ctx.send("Failed to reset the counting channel.")
        return

bot.run(TOKEN)
