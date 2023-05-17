import discord
from discord.ext import commands
import os
import json
import ast
import operator as op

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
    'increment': 1
}

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
async def set_increment(ctx, increment: int):
    ensure_data_file_exists()
    with open(data_file, 'r') as f:
        all_data = json.load(f)
    data = all_data.get(str(ctx.guild.id), default_data.copy())
    data['increment'] = increment
    all_data[str(ctx.guild.id)] = data
    with open(data_file, 'w') as f:
        json.dump(all_data, f, indent=4)
    await ctx.send(f'Increment has been set to {increment}')

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
        try:
            result = safe_eval(message.content)
            if result == data['count'] + data['increment']:
                if message.author.id != data['last_counter_id']:
                    data['count'] += data['increment']
                    data['last_counter_id'] = message.author.id
                    if data['count'] > data['high_score']:
                        data['high_score'] = data['count']
                        await message.add_reaction('🏆')
                    else:
                        await message.add_reaction('✅')
                else:
                    fail_reason = "You can't count two numbers in a row. Let others participate!"
            else:
                fail_reason = "The number doesn't follow the counting sequence."
        except Exception:
            fail_reason = "The text you entered is not a valid mathematical expression."

        if fail_reason:
            await message.add_reaction('❌')
            await message.delete()
            old_increment = data['increment']  # Store the old increment value
            data['count'] = 0
            data['last_counter_id'] = None
            # delete and recreate the channel
            channel_name = message.channel.name
            position = message.channel.position
            overwrites = message.channel.overwrites
            category = message.channel.category
            await message.channel.delete()
            new_channel = await message.guild.create_text_channel(channel_name, position=position, overwrites=overwrites, category=category)
            data['channel_id'] = new_channel.id

            # create the failure embed with increment information
            embed = discord.Embed(
                title="Counting Failure",
                description=f"**Failure Reason:** {fail_reason}\n**Message:** {message.content}\n**Failed by:** {message.author.mention}",
                color=discord.Color.red()
            )
            increment_value = f"{data['increment']}"
            increment_text = f"Increment: {old_increment} ➡️ {increment_value}"
            embed.add_field(name="Increment Information", value=increment_text, inline=False)
            await new_channel.send(embed=embed)




    all_data[str(message.guild.id)] = data
    with open(data_file, 'w') as f:
        json.dump(all_data, f, indent=4)

bot.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY')
