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
guilds = {}  # Declare guilds as a global variable
trophy_emoji = "🏆"  # Define the trophy emoji

def save_data():
    try:
        with open('bot_data.json', 'w') as f:
            json.dump(guilds, f, indent=4)
        print("Data saved successfully.")
    except Exception as e:
        print(f"Error when saving data: {e}")

def load_data():
    global guilds
    if os.path.isfile('bot_data.json'):
        with open('bot_data.json') as f:
            guilds = json.load(f)
    else:
        guilds = {}

@bot1.event
async def on_ready():
    load_data()
    print(f'{bot1.user} has connected to Discord!')

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
    guild_id = ctx.guild.id
    guilds[guild_id] = {
        'counting_channel': {
            'id': channel.id,
            'name': channel.name,
            'topic': '',
            'category_id': channel.category_id,
        },
        'count': {
            'increment': 1,
            'last_counter': None,
            'high_score': 0,
            'last_counter_user': None
        }
    }
    await ctx.send(f"Counting channel set to {channel.mention}")
    save_data()

@bot1.command()
async def increment(ctx, num: int):
    guild_id = ctx.guild.id
    guilds[guild_id]['count']['increment'] = num
    await ctx.send(f"Increment changed to {num}")
    save_data()

@bot1.event
async def on_message(message):
    if message.author == bot1.user:
        return

    if not isinstance(message.channel, discord.TextChannel):
        return

    guild_id = message.guild.id
    guild_data = guilds.get(guild_id)
    counting_channel = guild_data.get('counting_channel')
    count_data = guild_data.get('count')

    if counting_channel is None or counting_channel['id'] != message.channel.id:
        await bot1.process_commands(message)
        return

increment = count_data.get('increment')
last_counter = count_data.get('last_counter')

if increment is None:
    await bot1.process_commands(message)
    return

content = message.content.strip()

# Check for failure scenarios
if last_counter is None:
    if int(content) == increment:  # Check if the first number equals the increment
        count_data['last_counter'] = int(content)
        count_data['last_counter_user'] = message.author.id
        if int(content) > count_data.get('high_score', 0):
            count_data['high_score'] = int(content)
        save_data()
        await message.add_reaction('✅')  # Add a check mark reaction to the valid counting message
    else:
        await message.channel.send(f"The first number should be {increment}.")  # Inform user if they start with a different number
        await reset_counting_channel(message.guild, counting_channel, "Invalid First Number")  # Reset counting channel
    return

# Check if the counting message is valid
is_valid, failure_reason = check_counting_message(content, increment, last_counter)

if not is_valid:
    # Send failure message and reset counting channel
    embed = discord.Embed(title="Counting Failure", color=discord.Color.red())
    embed.add_field(name="Failure Reason", value=failure_reason, inline=False)
    embed.add_field(name="Your Count", value=content, inline=False)
    embed.add_field(name="Old Increment", value=f"Current: {increment}", inline=False)
    embed.add_field(name="New Increment", value=f"Updated: {count_data.get('increment', increment)}", inline=False)
    embed.add_field(name="High Score", value=f"Current: {count_data.get('high_score')}", inline=False)
    embed.add_field(name="Last Counter", value=f"Current: {last_counter}", inline=False)
    embed.add_field(name="Last Counter User", value=f"Current: {count_data.get('last_counter_user')}", inline=False)

    await reset_counting_channel(message.guild, counting_channel, failure_reason)  # Reset counting channel

    # Mention the user who failed in the failure message
    failure_user = bot1.get_user(count_data.get('last_counter_user'))
    if failure_user:
        embed.set_footer(text=f"Failed by {failure_user.display_name}")
    else:
        embed.set_footer(text="Failed by an unknown user")

    # Send the failure message to the new channel
    new_channel = await get_new_counting_channel(message.guild, counting_channel)
    if new_channel:
        await new_channel.send(embed=embed)
    
    return

# Valid counting message
count_data['last_counter'] = int(content)
count_data['last_counter_user'] = message.author.id
if int(content) > count_data.get('high_score', 0):
    count_data['high_score'] = int(content)
save_data()
if int(content) == count_data.get('high_score', 0):
    await message.add_reaction(trophy_emoji)  # Add a trophy reaction if high score is reached
else:
    await message.add_reaction('✅')  # Add a check mark reaction to the valid counting message

async def reset_counting_channel(guild, counting_channel, failure_reason):
    old_channel = guild.get_channel(counting_channel['id'])

    if old_channel is None:
        await guild.owner.send("The counting channel no longer exists. Please set a new counting channel.")
        save_data()
        return

    new_channel = await old_channel.clone(reason="Counting channel reset")
    await old_channel.delete(reason="Counting channel reset")

    guild_data = guilds.get(guild.id)
    guild_data['counting_channel']['id'] = new_channel.id
    count_data = guild_data['count']
    count_data['last_counter'] = None
    count_data['last_counter_user'] = None
    save_data()
    return new_channel


async def get_new_counting_channel(guild, counting_channel):
    new_channel = guild.get_channel(counting_channel['id'])
    return new_channel


@bot1.command()
async def highscore(ctx):
    guild_data = guilds.get(ctx.guild.id)
    high_score = guild_data.get('count', {}).get('high_score')
    if high_score is not None:
        await ctx.send(f"The high score is {high_score}")
    else:
        await ctx.send("No high score recorded yet.")


@bot1.command()
async def help(ctx):
    embed = discord.Embed(title="Counting Bot Help", description="List of commands for the counting bot:", color=discord.Color.green())
    embed.add_field(name="!set_channel [channel]", value="Sets the channel for counting.", inline=False)
    embed.add_field(name="!increment [number]", value="Changes the counting increment.", inline=False)
    embed.add_field(name="!highscore", value="Displays the current high score.", inline=False)
    await ctx.send(embed=embed)




bot1.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY')




