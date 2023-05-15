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
        counting_channels = {int(guild_id): channel_id for guild_id, channel_id in data['counting_channels'].items()}
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
            'counting_channels': {str(guild_id): channel_id for guild_id, channel_id in counting_channels.items()},
            'increments': increments,
            'last_counters': last_counters,
            'high_scores': high_scores,
            'last_counter_users': last_counter_users
        }, f)


def evaluate_expression(expression):
    try:
        tree = ast.parse(expression, mode='eval')
        return eval(compile(tree, filename='', mode='eval'), {}, allowed_operators)
    except (SyntaxError, TypeError, ZeroDivisionError):
        return None


def check_counting_message(content, increment, last_counter):
    try:
        number = int(content)
        if number == last_counter + increment:
            return True, number
        else:
            return False, f"The next number should be {last_counter + increment}."
    except ValueError:
        result = evaluate_expression(content)
        if result is not None and result == last_counter + increment:
            return True, result
        else:
            return False, f"The next number should be {last_counter + increment}."


@bot1.command()
async def set_channel(ctx, channel: discord.TextChannel):
    counting_channels[ctx.guild.id] = str(channel.id)
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


@bot1.event
async def on_message(message):
    if message.author == bot1.user:
        return

    await bot1.process_commands(message)

    if not isinstance(message.channel, discord.TextChannel):
        return

    if message.guild.id not in counting_channels:
        return

    if message.channel.id != counting_channels[message.guild.id]:
        return

    if message.guild.id not in increments:
        return

    increment = increments[message.guild.id]
    last_counter = last_counters.get(message.guild.id)

    content = message.content.strip()

       # Check for failure scenarios
    if last_counter is not None:
        if message.author.id == last_counter_users.get(message.guild.id):
            # Same user counting twice in a row
            failure_reason = "You counted twice in a row."
        else:
            is_valid, result = check_counting_message(content, increment, last_counter)
            if is_valid:
                last_counters[message.guild.id] = result
                last_counter_users[message.guild.id] = message.author.id
                if result > high_scores.get(message.guild.id, 0):
                    high_scores[message.guild.id] = result
                save_data()
                await message.add_reaction('✅')  # Add a reaction to the valid counting message
                return
            else:
                failure_reason = result

        # Send failure message and reset counting channel
        await message.channel.send(f"You made a mistake in counting. The counting channel will be reset.\n"
                                   f"Failure Reason: {failure_reason}\n"
                                   f"Your Count: {content}\n"
                                   f"Increment: {increment}\n"
                                   f"Increment Changed To: {increments.get(message.guild.id, increment)}")
        await reset_counting_channel(
            message.guild,
            failure_reason,
            content,
            increment,
            changed_increment=increments.get(message.guild.id, increment)
        )
        return

    # Valid counting message
    last_counters[message.guild.id] = int(content)
    last_counter_users[message.guild.id] = message.author.id
    if int(content) > high_scores.get(message.guild.id, 0):
        high_scores[message.guild.id] = int(content)
    save_data()
    await message.add_reaction('✅')  # Add a reaction to the valid counting message


async def reset_counting_channel(guild, failure_reason, current_count, increment, changed_increment):
    channel_id = counting_channels[guild.id]
    channel = guild.get_channel(int(channel_id))

    if channel is None:
        await guild.owner.send("The counting channel no longer exists. Please set a new counting channel.")
        del counting_channels[guild.id]
        del increments[guild.id]
        del last_counters[guild.id]
        del high_scores[guild.id]
        del last_counter_users[guild.id]
        save_data()
        return

    await channel.delete()

    new_channel = await guild.create_text_channel(
        name=channel.name,
        category=channel.category,
        overwrites=channel.overwrites,
        topic=f"Counting Channel\nFailure Reason: {failure_reason}\n"
              f"Last Count: {current_count}\n"
              f"Increment: {increment}\n"
              f"Increment Changed To: {changed_increment}"
    )

    counting_channels[guild.id] = str(new_channel.id)
    increments[guild.id] = changed_increment
    last_counters[guild.id] = None
    high_scores[guild.id] = 0
    last_counter_users[guild.id] = None
    save_data()


@bot1.command()
async def highscore(ctx):
    if ctx.guild.id in high_scores:
        await ctx.send(f"The high score is {high_scores[ctx.guild.id]}")
    else:
        await ctx.send("No high score recorded yet.")


@bot1.command()
async def help(ctx):
    embed = discord.Embed(title="Counting Bot Help", description="List of commands for the counting bot:", color=0x00FF00)
    embed.add_field(name="!set_channel [channel]", value="Sets the channel for counting.", inline=False)
        embed.add_field(name="!increment [number]", value="Changes the counting increment.", inline=False)
    await ctx.send(embed=embed)


@bot1.event
async def on_ready():
    print(f'{bot1.user} has connected to Discord!')









bot1.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.Gc2MCb.LXE8ptGi_uQqn0FBzvF461pMBAZUCzyP4nMRtY')
