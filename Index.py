import os
import random
import discord
import ast
from discord.ext import commands

TOKEN = 'MTEwNTU5ODczNjU1MTM4NzI0Nw.GPvg6N.9tTbgt6_foufoqCXQMErzIilg4wdhud8QEPq3Y'

intents = discord.Intents.default()
intents.typing = False
intents.presences = False
intents.message_content = True

bot = commands.Bot(command_prefix='!', intents=intents)

count_channel_id = None
count = 1
last_counter_id = None
high_score = 0
increment = 1

CHANNEL_FILE = 'count_channel.txt'
HIGH_SCORE_FILE = 'high_score.txt'
INCREMENT_FILE = 'increment.txt'

if os.path.exists(CHANNEL_FILE):
    with open(CHANNEL_FILE, 'r') as file:
        count_channel_id = int(file.read())

if os.path.exists(HIGH_SCORE_FILE):
    with open(HIGH_SCORE_FILE, 'r') as file:
        high_score = int(file.read())

if os.path.exists(INCREMENT_FILE):
    with open(INCREMENT_FILE, 'r') as file:
        increment = int(file.read())

@bot.event
async def on_ready():
    print(f'We have logged in as {bot.user}')

async def set_counting_channel(ctx, channel_id: int):
    global count_channel_id
    count_channel_id = channel_id
    await ctx.send(f'Set counting channel to <#{count_channel_id}>')

    with open(CHANNEL_FILE, 'w') as file:
        file.write(str(count_channel_id))

async def set_increment(ctx, new_increment: int):
    global increment
    increment = new_increment
    await ctx.send(f'Set increment to {increment}')

    with open(INCREMENT_FILE, 'w') as file:
        file.write(str(increment))

async def add_reaction(message, success=True, trophy=False):
    success_emoji_list = ['\U00002705']
    failure_emoji_list = ['\U0000274C']
    trophy_emoji = '\U0001F3C6'

    if trophy:
        emoji = trophy_emoji
    elif success:
        emoji_list = success_emoji_list
        emoji = random.choice(emoji_list)
    else:
        emoji_list = failure_emoji_list
        emoji = random.choice(emoji_list)

    await message.add_reaction(emoji)

def safe_eval(expr):
    try:
        node = ast.parse(expr, mode='eval')
        if not isinstance(node.body, (ast.UnaryOp, ast.BinOp, ast.Num)):
            return None
        return eval(compile(node, '<string>', 'eval'))
    except Exception:
        return None

async def recreate_channel(channel, message):
    new_channel = await channel.clone()
    await channel.delete()
    await new_channel.send(f"{message.author.mention} caused a game failure with: \"{message.content}\"")
    return new_channel

@bot.command(name="setcountingchannel")
async def cmd_set_counting_channel(ctx, channel_id: int):
    await set_counting_channel(ctx, channel_id)

@bot.command(name="setincrement")
async def cmd_set_increment(ctx, new_increment: int):
    await set_increment(ctx, new_increment)

bot.run(TOKEN)
