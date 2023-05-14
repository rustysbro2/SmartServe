import discord
from discord.ext import commands

intents = discord.Intents.default()
intents.messages = True
intents.reactions = True
bot = commands.Bot(command_prefix='!', intents=intents, help_command=None)

counting_channels = {}
increments = {}
last_counters = {}
high_scores = {}

async def check_counting_message(ctx, count, increment, last_counter):
    if ctx.author.id == last_counter:
        await ctx.channel.send(f"{ctx.author.mention}, you can't count twice in a row!")
        return False
    try:
        count = int(count)
    except ValueError:
        await ctx.channel.send(f"{ctx.author.mention}, only numbers are allowed!")
        return False
    return count == increment

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user}')

@bot.command()
async def set_channel(ctx, channel: discord.TextChannel):
    counting_channels[ctx.guild.id] = channel.id
    increments[ctx.guild.id] = 1
    last_counters[ctx.guild.id] = None
    high_scores[ctx.guild.id] = 0
    await ctx.send(f"Counting channel set to {channel.mention}")

@bot.command()
async def increment(ctx, value: int):
    increments[ctx.guild.id] = value
    await ctx.send(f"Increment value set to {value}")

@bot.command()
async def help(ctx):
    embed = discord.Embed(
        title="Counting Bot Help",
        description="List of commands for the Counting Bot",
        color=discord.Color.blue()
    )

    embed.add_field(
        name="!set_channel [channel]",
        value="Set the counting channel to [channel]",
        inline=False
    )

    embed.add_field(
        name="!increment [value]",
        value="Set the increment value for counting",
        inline=False
    )

    embed.add_field(
        name="!help",
        value="Display this help message",
        inline=False
    )

    await ctx.send(embed=embed)

@bot.event
async def on_message(message):
    if message.author.bot:
        return

    await bot.process_commands(message)  # Move this line to the beginning of the on_message event handler

    if message.guild and message.channel.id == counting_channels.get(message.guild.id):
        guild_id = message.guild.id
        increment = increments[guild_id]
        last_counter = last_counters[guild_id]

        if await check_counting_message(message, message.content, increment, last_counter):
            last_counters[guild_id] = message.author.id
            await message.add_reaction("✅")

            score = int(message.content)
            if score > high_scores[guild_id]:
                high_scores[guild_id] = score
                await message.add_reaction("🏆")
        else:
            await message.channel.delete()
            new_channel = await message.guild.create_text_channel("counting")
            counting_channels[guild_id] = new_channel.id
            embed = discord.Embed(title="Counting Failure", description=f"Reason: Invalid count\nIncrement: {increment}\nFailed message: {message.content}", color=0xFF0000)
            await new_channel.send(embed=embed)




bot.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.Gc2MCb.LXE8ptGi_uQqn0FBzvF461pMBAZUCzyP4nMRtY')

