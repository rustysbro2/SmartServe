import discord
from discord.ext import commands
import ast

intents = discord.Intents.default()
intents.message_content = True
bot1 = commands.Bot(command_prefix="!", intents=intents)

counting_channels = {}
increments = {}
last_counters = {}
high_scores = {}

allowed_operators = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.BitXor: operator.xor,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos
}

async def check_counting_message(message, count, increment, last_counter):
    if message.author.id == last_counter:
        await message.channel.send(f"{message.author.mention}, you can't count twice in a row!")
        return False, None

    try:
        node = ast.parse(count, mode='eval')
    except SyntaxError:
        await message.channel.send(f"{message.author.mention}, only numbers and math expressions are allowed!")
        return False, None

    if not all(isinstance(node, tuple(allowed_operators.keys())) for node in ast.walk(node)):
        await message.channel.send(f"{message.author.mention}, only numbers and math expressions are allowed!")
        return False, None

    try:
        result = eval(compile(ast.Expression(node.body), filename="<ast>", mode="eval"), {"__builtins__": None}, allowed_operators)
    except ZeroDivisionError:
        await message.channel.send(f"{message.author.mention}, division by zero is not allowed!")
        return False, None

    return result == increment, result

@bot1.command()
async def set_channel(ctx, channel: discord.TextChannel):
    counting_channels[ctx.guild.id] = channel.id
    increments[ctx.guild.id] = 1
    last_counters[ctx.guild.id] = None
    high_scores[ctx.guild.id] = 0
    await ctx.send(f"Counting channel set to {channel.mention}")

@bot1.command()
async def increment(ctx, num: int):
    increments[ctx.guild.id] = num
    await ctx.send(f"Increment changed to {num}")

@bot1.event
async def on_message(message):
    if message.author.bot:
        return

    if message.guild and message.channel.id == counting_channels.get(message.guild.id):
        guild_id = message.guild.id
        increment = increments[guild_id]
        last_counter = last_counters[guild_id]

        is_valid, result = await check_counting_message(message, message.content, increment, last_counter)
        if is_valid:
            last_counters[guild_id] = message.author.id
            increments[guild_id] = result + 1
            await message.add_reaction("✅")

            if result > high_scores[guild_id]:
                high_scores[guild_id] = result
                await message.add_reaction("🏆")
        else:
            channel_name = message.channel.name
            channel_position = message.channel.position
            channel_category = message.channel.category
            channel_overwrites = message.channel.overwrites
            channel_topic = message.channel.topic

            await message.channel.delete()

            new_channel = await message.guild.create_text_channel(
                name=channel_name,
                position=channel_position,
                category=channel_category,
                overwrites=channel_overwrites,
                topic=channel_topic
            )
            counting_channels[guild_id] = new_channel.id
            last_counters[guild_id] = None
            increments[guild_id] = 1
            embed = discord.Embed(title="Counting Failure", description=f"Reason: Invalid count\nIncrement: {increment}\nFailed message: {message.content}", color=0xFF0000)
            await new_channel.send(embed=embed)
    else:
        await bot1.process_commands(message)

@bot1.command()
async def help(ctx):
    embed = discord.Embed(title="Counting Bot Help", description="List of commands for the counting bot:", color=0x00FF00)
    embed.add_field(name="!set_channel [channel]", value="Sets the channel for counting.", inline=False)
    embed.add_field(name="!increment [number]", value="Changes the counting increment.", inline=False)
    await ctx.send(embed=embed)

@bot1.event
async def on_ready():
    print(f'{bot1.user} has connected to Discord!')

bot1.remove_command("help")
bot1.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.Gc2MCb.LXE8ptGi_uQqn0FBzvF461pMBAZUCzyP4nMRtY')
