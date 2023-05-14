import discord
from discord.ext import commands

intents = discord.Intents.all()
bot1 = commands.Bot(command_prefix='!', intents=intents, help_command=None)

counting_channels = {}
increments = {}
last_counters = {}
high_scores = {}

async def check_counting_message(message, count, increment, last_counter):
    if message.author.id == last_counter:
        await message.channel.send(f"{message.author.mention}, you can't count twice in a row!")
        return False
    try:
        count = int(count)
    except ValueError:
        await message.channel.send(f"{message.author.mention}, only numbers are allowed!")
        return False
    return count == increment

@bot1.event
async def on_ready():
    print(f'Logged in as {bot1.user}')

@bot1.command()
async def set_channel(ctx, channel: discord.TextChannel):
    counting_channels[ctx.guild.id] = channel.id
    increments[ctx.guild.id] = 1
    last_counters[ctx.guild.id] = None
    high_scores[ctx.guild.id] = 0
    await ctx.send(f"Counting channel set to {channel.mention}")

@bot1.command()
async def increment(ctx, value: int):
    increments[ctx.guild.id] = value
    await ctx.send(f"Increment value set to {value}")

@bot1.command()
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

@bot1.event
async def on_message(message):
    if message.author.bot:
        return

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
            # Store channel properties before deletion
            channel_name = message.channel.name
            channel_position = message.channel.position
            channel_category = message.channel.category
            channel_permissions = message.channel.permission_overwrites
            channel_topic = message.channel.topic

            # Delete the channel
            await message.channel.delete()

            # Create a new channel with the same properties
            new_channel = await message.guild.create_text_channel(
                name=channel_name,
                position=channel_position,
                category=channel_category,
                overwrites=channel_permissions,
                topic=channel_topic
            )
            counting_channels[guild_id] = new_channel.id
            last_counters[guild_id] = None  # Clear the last user for the specific server
            embed = discord.Embed(title="Counting Failure", description=f"Reason: Invalid count\nIncrement: {increment}\nFailed message: {message.content}", color=0xFF0000)
            await new_channel.send(embed=embed)
    else:
        await bot1.process_commands(message)




bot1.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.Gc2MCb.LXE8ptGi_uQqn0FBzvF461pMBAZUCzyP4nMRtY')

