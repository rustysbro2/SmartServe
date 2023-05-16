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
        data = {}
        if os.path.isfile('bot_data.json'):
            with open('bot_data.json', 'r') as f:
                data = json.load(f)
        
        with open('bot_data.json', 'w') as f:
            data.update(guilds)
            json.dump(data, f, indent=4)
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
    save_data()  # Save the data when the bot is ready


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

    if guild_data is None:
        guild_data = {}  # Initialize with an empty dictionary if guild_data is None

    counting_channel = guild_data.get('counting_channel')
    count_data = guild_data.get('count')

    if counting_channel is None or counting_channel['id'] != message.channel.id:
        await bot1.process_commands(message)
        return

    increment = count_data.get('increment')
    last_counter = count_data.get('last_counter')
    last_counter_user = count_data.get('last_counter_user')

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
            await message.add_reaction('✅')  # Add a reaction to the valid counting message
            save_data()  # Save the data after updating the values
        else:
            await message.channel.send(f"The first number should be {increment}.")  # Inform user if they start with a different number
        return

    # Check if the counting message is valid
    is_valid, failure_reason = check_counting_message(content, increment, last_counter)

    if not is_valid or message.author.id == last_counter_user:
        # Send failure message and reset counting channel
        if message.author.id == last_counter_user:
            failure_reason = "You cannot count twice in a row."

        embed = discord.Embed(title="Counting Failure", color=0xFF0000)
        embed.add_field(name="Failure Reason", value=failure_reason, inline=False)
        embed.add_field(name="Your Count", value=content, inline=False)
        embed.add_field(name="Old Increment", value=increment, inline=False)
        embed.add_field(name="New Increment", value=count_data.get('increment', increment), inline=False)
        embed.add_field(name="Failed By", value=message.author.mention, inline=False)

        new_channel = await reset_counting_channel(
            message.guild,
            counting_channel,
            failure_reason,
            content,
            increment,
            changed_increment=count_data.get('increment', increment)
        )

        if new_channel is not None:
            await new_channel.send(embed=embed)
            count_data['last_counter'] = None
            count_data['last_counter_user'] = None
            save_data()  # Save the data after resetting the counting channel

        return

    # Valid counting message
    count_data['last_counter'] = int(content)
    count_data['last_counter_user'] = message.author.id
    if int(content) > count_data.get('high_score', 0):
        count_data['high_score'] = int(content)
    save_data()  # Save the data after updating the values
    await message.add_reaction('✅')  # Add a reaction to the valid counting message







async def reset_counting_channel(guild, counting_channel, failure_reason, current_count, increment, changed_increment):
    old_channel = guild.get_channel(counting_channel['id'])

    if old_channel is None:
        await guild.owner.send("The counting channel no longer exists. Please set a new counting channel.")
        save_data()
        return None

    new_channel = await old_channel.clone(reason="Counting channel reset")
    await old_channel.delete(reason="Counting channel reset")

    guild_data = guilds.get(guild.id)
    guild_data['counting_channel']['id'] = new_channel.id
    guild_data['count']['increment'] = changed_increment
    guild_data['count']['last_counter'] = None
    save_data()
    return new_channel


@bot1.command()
async def highscore(ctx):
    guild_data = guilds.get(ctx.guild.id)
    high_score = guild_data.get('count', {}).get('high_score')
    if high_score is not None:
        await ctx.send(f"The high score is {high_score}")




bot1.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY')




