import discord
from discord.ext import commands
import ast  
import operator
import os
import json

intents = discord.Intents.default()
intents.message_content = True
bot1 = commands.Bot(command_prefix="!", intents=intents)
bot1.remove_command("help")

if os.path.isfile('bot_data.json'):
    with open('bot_data.json') as f:
        data = json.load(f)
        counting_channels = data['counting_channels']
        increments = data['increments']
        last_counters = data['last_counters']
        high_scores = data['high_scores']
        last_counter_users = data['last_counter_users']
else:
    counting_channels = {}
    increments = {}
    last_counters = {}
    high_scores = {}
    last_counter_users = {}


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
def save_data():
    with open('bot_data.json', 'w') as f:
        json.dump({
            'counting_channels': counting_channels,
            'increments': increments,
            'last_counters': last_counters,
            'high_scores': high_scores,
            'last_counter_users': last_counter_users
        }, f)

async def check_counting_message(message, content, increment, last_counter):
    try:
        node = ast.parse(content.strip(), mode="eval").body
        if not all(isinstance(node, allowed_operators) for node in ast.walk(node)):
            return False, "Invalid count"

        count = eval(content)
        print(f"[DEBUG] Type of count: {type(count)}, value: {count}")  # Debug message
        print(f"[DEBUG] Type of increment: {type(increment)}, value: {increment}")  # Debug message
        if last_counter is None:
            if count == increment:
                print(f"[DEBUG] First count ({count}) is correct.")  # Debug message
                return True, count
            else:
                print(f"[DEBUG] First count ({count}) is incorrect.")  # Debug message
                return False, "Invalid count"
        elif count == last_counter + increment:
            return True, count
        else:
            return False, "Invalid count"
    except Exception as e:
        return False, "Invalid count"


async def handle_invalid_count(message, increment, last_counter):
    if last_counter is None:
        next_number = increment
    else:
        next_number = last_counter + increment
    await message.add_reaction("❌")
    await message.channel.send(
        f"Invalid count. The next number should be {next_number}."
    )

@bot1.command()
async def set_channel(ctx, channel: discord.TextChannel):
    counting_channels[ctx.guild.id] = channel.id
    increments[ctx.guild.id] = 1
    last_counters[ctx.guild.id] = None
    high_scores[ctx.guild.id] = 0
    last_counter_users[ctx.guild.id] = None
    await ctx.send(f"Counting channel set to {channel.mention}")
    save_data()

@bot1.command()
async def increment(ctx, num: int):
    increments[ctx.guild.id] = num
    await ctx.send(f"Increment changed to {num}")
    save_data()


@bot1.command()
async def reset_channel(ctx):
    counting_channel_id = counting_channels[ctx.guild.id]
    counting_channel = bot1.get_channel(counting_channel_id)
    increment = increments[ctx.guild.id]

    overwrites = {
        ctx.guild.default_role: discord.PermissionOverwrite(send_messages=False),
        ctx.guild.me: discord.PermissionOverwrite(send_messages=True)
    }

    await counting_channel.delete(reason="Resetting channel for new counting game.")
    new_counting_channel = await ctx.guild.create_text_channel("counting", overwrites=overwrites)

    counting_channels[ctx.guild.id] = new_counting_channel.id
    last_counters[ctx.guild.id] = None
    high_scores[ctx.guild.id] = 0

    await new_counting_channel.send(f"The counting starts at {increment}. Good luck!")

@bot1.event
async def on_message(message):
    if message.author == bot1.user:
        return

    if message.channel.id in counting_channels.values():
        increment = increments[message.guild.id]
        last_counter = last_counters.get(message.guild.id)

        if last_counter_users.get(message.guild.id) == message.author.id:
            await handle_invalid_count(message, increment, last_counter)
            return

        is_valid, result = await check_counting_message(message, message.content, increment, last_counter)
        if is_valid:
            await message.add_reaction("✅")
            last_counters[message.guild.id] = result
            last_counter_users[message.guild.id] = message.author.id
            save_data()

            if message.guild.id in high_scores:
                if result > high_scores[message.guild.id]:
                    high_scores[message.guild.id] = result
                    await message.add_reaction("🏆")
            else:
                high_scores[message.guild.id] = result
                save_data()
        else:
            await handle_invalid_count(message, increment, last_counter)
            await bot1.get_command('reset_channel').callback(message)

    await bot1.process_commands(message)

@bot1.command()
async def help(ctx):
    embed = discord.Embed(title="Counting Bot Help", description="List of commands for the counting bot:", color=0x00FF00)
    embed.add_field(name="!set_channel [channel]", value="Sets the channel for counting.", inline=False)
    embed.add_field(name="!increment [number]", value="Changes the counting increment.", inline=False)
    embed.add_field(name="!reset_channel", value="Resets the counting channel.", inline=False)
    await ctx.send(embed=embed)

@bot1.event
async def on_ready():
    print(f'{bot1.user} has connected to Discord!')



bot1.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.Gc2MCb.LXE8ptGi_uQqn0FBzvF461pMBAZUCzyP4nMRtY')
