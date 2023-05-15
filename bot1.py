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


def save_data():
    try:
        with open('bot_data.json', 'w') as f:
            to_save = {}
            for guild_id, data in guilds.items():
                to_save[guild_id] = {}
                for key, value in data.items():
                    if key == 'counting_channel':
                        channel_data = value.copy()
                        to_save[guild_id][key] = channel_data
                        to_save[guild_id][key]['id'] = value['id']  # Include the counting channel ID in the saved data
                    else:
                        to_save[guild_id][key] = value
            json.dump(to_save, f, indent=4)
        print("Data saved successfully.")
    except Exception as e:
        print(f"Error when saving data: {e}")



def load_data():
    global guilds
    if os.path.isfile('bot_data.json'):
        with open('bot_data.json') as f:
            data = json.load(f)
            guilds = {
                int(guild_id): {
                    key: value if key != 'counting_channel' else {
                        k: v if k != 'id' else int(v)
                        for k, v in value.items()
                    }
                    for key, value in data.get(str(guild_id), {}).items()
                }
                for guild_id in data
            }
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
    print(f"Before update: {guilds}")  # Print guilds before update
    guild_data = guilds.get(guild_id, {})
    guild_data['counting_channel'] = {
      'id': channel.id,
      'name': channel.name,
      'topic': '',
      'category_id': channel.category_id,
}



    guild_data['count'] = {
        'increment': 1,
        'last_counter': None,
        'high_score': 0,
        'last_counter_user': None
    }
    guilds[guild_id] = guild_data
    print(f"After update: {guilds}")  # Print guilds after update
    await ctx.send(f"Counting channel set to {channel.mention}")
    save_data()

@bot1.command()
async def increment(ctx, num: int):
    guild_id = ctx.guild.id
    guild_data = guilds.get(guild_id, {})
    count_data = guild_data.get('count', {})
    count_data['increment'] = num
    guilds[guild_id] = guild_data
    await ctx.send(f"Increment changed to {num}")
    save_data()


@bot1.event
async def on_message(message):
    if message.author == bot1.user:
        return

    if not isinstance(message.channel, discord.TextChannel):
        return

    if message.content.startswith(bot1.command_prefix):
        await bot1.process_commands(message)  # Process commands even if it's not a counting message
        return

    guild_id = message.guild.id
    guild_data = guilds.get(guild_id, {})
    counting_channel = guild_data.get('counting_channel')
    count_data = guild_data.get('count', {})

    if counting_channel is None or counting_channel['id'] != message.channel.id:
        return

    increment = count_data.get('increment')
    last_counter = count_data.get('last_counter')

    if increment is None:
        return

    content = message.content.strip()



    # Check for failure scenarios
    if last_counter is not None:
        if message.author.id == count_data.get('last_counter_user'):
            # Same user counting twice in a row
            failure_reason = "You counted twice in a row."
        else:
            is_valid, result = check_counting_message(content, increment, last_counter)
            if is_valid:
                count_data['last_counter'] = result
                count_data['last_counter_user'] = message.author.id
                if result > count_data.get('high_score', 0):
                    count_data['high_score'] = result
                save_data()
                await message.add_reaction('✅')  # Add a reaction to the valid counting message
                return
            else:
                failure_reason = result

        # Send failure message and reset counting channel
        embed = discord.Embed(title="Counting Failure", color=0xFF0000)
        embed.add_field(name="Failure Reason", value=failure_reason, inline=False)
        embed.add_field(name="Your Count", value=content, inline=False)
        embed.add_field(name="Increment", value=increment, inline=False)
        embed.add_field(name="Increment Changed To", value=count_data.get('increment', increment), inline=False)

        await message.channel.send("You made a mistake in counting. The counting channel will be reset.", embed=embed)
        await reset_counting_channel(
            message.guild,
            failure_reason,
            content,
            increment,
            changed_increment=count_data.get('increment', increment)
        )
        return

    # Valid counting message
    count_data['last_counter'] = int(content)
    count_data['last_counter_user'] = message.author.id
    if int(content) > count_data.get('high_score', 0):
        count_data['high_score'] = int(content)
    save_data()
    await message.add_reaction('✅')  # Add a reaction to the valid counting message


async def reset_counting_channel(guild, failure_reason, current_count, increment, changed_increment):
    guild_data = guilds.get(guild.id, {})
    counting_channel = guild_data.get('counting_channel')

    if counting_channel is None:
        await guild.owner.send("The counting channel no longer exists. Please set a new counting channel.")
        save_data()
        return

    old_channel_id = counting_channel['id']
    channel_name = counting_channel['name']
    category = guild.get_channel(counting_channel['category_id'])  # Get category object
    topic = f"Counting Channel\nFailure Reason: {failure_reason}\n" \
            f"Last Count: {current_count}\n" \
            f"Increment: {increment}\n" \
            f"Increment Changed To: {changed_increment}"

    new_channel = await guild.create_text_channel(name=channel_name, category=category, topic=topic)

    guild_data['counting_channel']['id'] = new_channel.id  # Update the counting channel ID in guild data
    guild_data['count']['increment'] = changed_increment  # Update the increment in guild data
    guild_data['count']['last_counter'] = None  # Reset the last counter in guild data
    guild_data['count']['high_score'] = 0  # Reset the high score in guild data
    guild_data['count']['last_counter_user'] = None  # Reset the last counter user in guild data
    save_data()

    # Send the failure message to the new counting channel
    embed = discord.Embed(title="Counting Failure", color=0xFF0000)
    embed.add_field(name="Failure Reason", value=failure_reason, inline=False)
    embed.add_field(name="Your Count", value=current_count, inline=False)
    embed.add_field(name="Increment", value=increment, inline=False)
    embed.add_field(name="Increment Changed To", value=changed_increment, inline=False)

    new_message = await new_channel.send("You made a mistake in counting. The counting channel will be reset.", embed=embed)

    if guild_data['count']['last_counter_user'] is not None:
        # Fetch the old message in the old counting channel if last_counter_user is not None
        old_channel = guild.get_channel(old_channel_id)
        try:
            message = await old_channel.fetch_message(guild_data['count']['last_counter_user'])
            await message.delete()  # Delete the old message in the old counting channel
        except discord.NotFound:
            # If the old message is not found, continue without deleting it
            pass

    # Delete the old counting channel
    old_channel = guild.get_channel(old_channel_id)
    if old_channel:
        await old_channel.delete()

    # Update the counting channel ID in the guild data
    counting_channel['id'] = new_channel.id
    save_data()








@bot1.command()
async def highscore(ctx):
    guild_data = guilds.get(ctx.guild.id, {})
    high_score = guild_data.get('count', {}).get('high_score')
    if high_score is not None:
        await ctx.send(f"The high score is {high_score}")
    else:
        await ctx.send("No high score recorded yet.")


@bot1.command()
async def help(ctx):
    embed = discord.Embed(title="Counting Bot Help", description="List of commands for the counting bot:", color=0x00FF00)
    embed.add_field(name="!set_channel [channel]", value="Sets the channel for counting.", inline=False)
    embed.add_field(name="!increment [number]", value="Changes the counting increment.", inline=False)
    await ctx.send(embed=embed)




bot1.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY')


