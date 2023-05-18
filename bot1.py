import discord
from discord.ext import commands
import os
import json
import ast
import operator as op
import inspect

intents = discord.Intents().all()
bot = commands.Bot(command_prefix='!', intents=intents)

# the file where we will save our data
data_file = 'count_data.json'

# the expected keys and their default values
default_data = {
    'channel_id': None,
    'count': 0,
    'last_counter_id': None,
    'high_score': 0,
    'increment': 1,
    'pending_increment': None,
    'old_increment': 1,
    'successful_counts': 0  # add this line
}

# Add your extension names here
extensions = ['giveaway', 'tracking']

def ensure_data_file_exists():
    if not os.path.exists(data_file):
        with open(data_file, 'w') as f:
            json.dump({}, f, indent=4)

# supported operators
operators = {ast.Add: op.add, ast.Sub: op.sub, ast.Mult: op.mul, ast.Div: op.truediv, ast.USub: op.neg}

# evaluate expressions safely
def eval_expr(node):
    if isinstance(node, ast.Num):  # <number>
        return node.n
    elif isinstance(node, ast.BinOp):  # <left> <operator> <right>
        return operators[type(node.op)](eval_expr(node.left), eval_expr(node.right))
    elif isinstance(node, ast.UnaryOp):  # <operator> <operand> e.g., -1
        return operators[type(node.op)](eval_expr(node.operand))
    else:
        raise TypeError(node)

def safe_eval(expr):
    return eval_expr(ast.parse(expr, mode='eval').body)

@bot.event
async def on_ready():
    print(f"We have logged in as {bot.user}")
    ensure_data_file_exists()

    with open(data_file, 'r') as f:
        all_data = json.load(f)

    for guild in bot.guilds:
        guild_id = str(guild.id)
        if guild_id not in all_data:
            all_data[guild_id] = default_data.copy()
        else:
            existing_data = all_data[guild_id]
            for key, value in default_data.items():
                if key not in existing_data:
                    existing_data[key] = value

    with open(data_file, 'w') as f:
        json.dump(all_data, f, indent=4)


    await generate_help_data()
        
# Load extensions
for extension in extensions:
    bot.load_extension(extension)

async def generate_help_data():
    help_data = {}

    for command in bot.commands:
        if not command.hidden:
            usage = get_command_usage(command)
            help_data[command.name] = usage

    with open('help_data.json', 'w') as f:
        json.dump(help_data, f, indent=4)

def get_command_usage(command):
    signature = f"!{command.name}"
    params = inspect.signature(command.callback).parameters.values()
    params_str = []

    for param in params:
        if param.name not in ['self', 'ctx']:
            if param.default is not param.empty:
                params_str.append(f"[{param.name}]")
            else:
                params_str.append(f"<{param.name}>")

    usage = " ".join(params_str)
    return f"{signature} {usage}"








        


bot.remove_command('help')
@bot.command()
async def help(ctx):
    try:
        with open('help_data.json', 'r') as f:
            help_data = json.load(f)
    except FileNotFoundError:
        help_data = {}

    embed = discord.Embed(title="Available commands", color=discord.Color.green())

    for cmd, usage in help_data.items():
        embed.add_field(name=f"**{cmd}**", value=usage, inline=False)

    await ctx.send(embed=embed)





@bot.command()
async def set_channel(ctx, channel: discord.TextChannel):
    ensure_data_file_exists()
    with open(data_file, 'r') as f:
        all_data = json.load(f)
    data = all_data.get(str(ctx.guild.id), default_data.copy())
    data['channel_id'] = channel.id
    all_data[str(ctx.guild.id)] = data
    with open(data_file, 'w') as f:
        json.dump(all_data, f, indent=4)
    await ctx.send(f'Counting channel has been set to {channel.mention}')

@bot.command()
async def set_increment(ctx, new_increment: int):
    ensure_data_file_exists()
    with open(data_file, 'r') as f:
        all_data = json.load(f)
    data = all_data.get(str(ctx.guild.id), default_data.copy())
    data['pending_increment'] = new_increment  # Update the pending_increment instead of increment
    all_data[str(ctx.guild.id)] = data
    with open(data_file, 'w') as f:
        json.dump(all_data, f, indent=4)
    await ctx.send(f'Counting increment will be set to {new_increment} after next failure.')

@bot.event
async def on_message(message):
    await bot.process_commands(message)

    if message.author == bot.user:
        return

    ensure_data_file_exists()

    with open(data_file, 'r') as f:
        all_data = json.load(f)

    data = all_data.get(str(message.guild.id))
    if not data:
        return

    if message.channel.id == data.get('channel_id'):
        fail_reason = ""
        increment_changed = False  # Initialize increment_changed as False

        try:
            result = safe_eval(message.content)
            if result == data['count'] + data['increment']:
                if message.author.id != data['last_counter_id']:
                    data['count'] += data['increment']
                    data['last_counter_id'] = message.author.id
                    data['successful_counts'] += 1  # increase the number of successful counts
                    print(f"Message: {message.content}")  # Log the message content
                    print(f"Current count: {data['count']}")  # Log the current count
                    print(f"Current increment: {data['increment']}")  # Log the current increment
                    print(f"Successful counts: {data['successful_counts']}")  # Log the successful counts
                    if data['successful_counts'] > data['high_score']:  # compare successful counts to high score
                        data['high_score'] = data['successful_counts']  # update high score based on successful counts
                        print(f"New high score: {data['high_score']}")  # Log the new high score
                        await message.add_reaction('🏆')
                    else:
                        await message.add_reaction('✅')

                    # Save the updated data to the JSON file
                    all_data[str(message.guild.id)] = data
                    with open(data_file, 'w') as f:
                        json.dump(all_data, f, indent=4)
                else:
                    fail_reason = "You can't count two numbers in a row. Let others participate!"
            else:
                fail_reason = "The number doesn't follow the counting sequence."
        except Exception:
            fail_reason = "The text you entered is not a valid mathematical expression."

        if fail_reason:
            print('Fail reason:', fail_reason)
            await message.add_reaction('❌')
            await message.delete()
            expected_number = data['count'] + data['increment']  # Calculate the expected number

            # Reset the count and last counter ID
            data['count'] = 0
            data['last_counter_id'] = None
            data['successful_counts'] = 0  # reset successful counts
            if data['pending_increment'] is not None:  # If there's a pending increment
                data['old_increment'] = data['increment']  # Save the old increment
                data['increment'] = data['pending_increment']  # Apply the pending increment
                increment_changed = True  # Set increment_changed to True if there's a pending increment
                data['pending_increment'] = None  # Reset the pending increment
            print('New game started')

            all_data[str(message.guild.id)] = data
            with open(data_file, 'w') as f:
                json.dump(all_data, f, indent=4)

            # Check if a new counting channel should be created
            old_channel_id = data['channel_id']
            old_channel = bot.get_channel(old_channel_id)
            new_channel = await old_channel.clone(name=old_channel.name)
            data['channel_id'] = new_channel.id
            await old_channel.delete()

            # Update the data file with the new channel ID
            with open(data_file, 'w') as f:
                json.dump(all_data, f, indent=4)

            # Create embed
            embed = discord.Embed(
                title="Counting Failure",
                description=f"**Failure Reason:** {fail_reason}\n"
                            f"**You typed:** {message.content}\n"
                            f"**Failed by:** {message.author.mention}\n"
                            f"**Expected Number:** {expected_number}",
                color=discord.Color.red()
            )
            if increment_changed:  # If the increment has changed
                embed.add_field(
                    name="**Increment Changed**",
                    value=f"The increment has changed from {data['old_increment']} ➡️ {data['increment']}."
                )

            # Send the embed
            await new_channel.send(embed=embed)

            # Ping the user and then delete the message
            ping_msg = await new_channel.send(message.author.mention)
            await ping_msg.delete()




bot.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY')
