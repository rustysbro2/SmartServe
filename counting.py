import discord
from discord.ext import commands
import os
import json
import inspect
import tracemalloc
import random
from giveaway import Giveaway
from tracking import Tracking  # Import the Tracking class
from musicbot import MusicBot




tracemalloc.start()


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
extensions = ['musicbot', 'giveaway', 'tracking']




# emojis lists
check_mark_emojis = ['✅', '☑️', '✔️']
trophy_emojis = ['🏆', '🥇', '🥈', '🥉']

@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.CommandNotFound):
        await ctx.send('Invalid command.')
    elif isinstance(error, commands.MissingRequiredArgument):
        await ctx.send('You missed some required arguments.')
    else:
        raise error


def ensure_data_file_exists():
    if not os.path.exists(data_file):
        with open(data_file, 'w') as f:
            json.dump({}, f, indent=4)

def generate_command_example(command):
    params = inspect.signature(command.callback).parameters.values()
    args = []

    for param in params:
        if param.name not in ['self', 'ctx']:
            if param.default is param.empty:
                args.append(f"<{param.name}>")
            else:
                args.append(f"[{param.name}]")

    example = f"!{command.name} {' '.join(args)}"
    return example

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

async def generate_help_data():
    help_data = {}

    for extension in extensions:
        ext = bot.get_cog(extension)
        print(f"Extension: {extension}, Cog: {ext}")
        if ext:
            for command in ext.get_commands():
                if not command.hidden:
                    usage = get_command_usage(command)
                    example = generate_command_example(command)
                    help_data[command.name] = {'usage': usage, 'example': example}

    try:  # Indentation corrected here
        with open('help_data.json', 'w') as f:
            json.dump(help_data, f, indent=4)

        print("Help data generated successfully.")
    except Exception as e:
        print(f"Error generating help data: {e}")




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

    for extension in extensions:
        try:
            bot.load_extension(extension)  # Load the extension
            print(f"Extension '{extension}' loaded successfully.")
        except commands.ExtensionError as e:
            print(f"Failed to load extension '{extension}': {e}")

    bot.loop.create_task(generate_help_data())  # Schedule the generate_help_data coroutine as a background task

    await bot.add_cog(Giveaway(bot))  # Add the Giveaway cog
    await bot.add_cog(Tracking(bot))  # Add the Tracking cog
    await bot.add_cog(MusicBot(bot))  # Add the MusicBot cog













bot.remove_command('help')
@bot.command()
async def help(ctx, command_name: str = None):
    try:
        with open('help_data.json', 'r') as f:
            help_data = json.load(f)
    except FileNotFoundError:
        help_data = {}

    embed = discord.Embed(title="Bot Help", color=discord.Color.blue())
    embed.set_thumbnail(url=bot.user.avatar.url)
    embed.description = "Welcome to the Bot Help!\nHere are the available commands:"

    if command_name is None:
        for cmd, usage in help_data.items():
            example = usage['example']
            value = f"`{usage['usage']}`\nExample: {example}" if example else f"`{usage['usage']}`"
            embed.add_field(name=f"**{cmd}**", value=value, inline=False)
    else:
        usage = help_data.get(command_name)
        if usage:
            example = usage['example']
            value = f"`{usage['usage']}`\nExample: {example}" if example else f"`{usage['usage']}`"
            embed.add_field(name=f"**{command_name}**", value=value, inline=False)
        else:
            embed.description = f"No information found for command: `{command_name}`"

    embed.set_footer(text="For more information, contact the bot owner.")
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
                        random_trophy = random.choice(trophy_emojis)
                        await message.add_reaction(random_trophy)
                    else:
                        random_check_mark = random.choice(check_mark_emojis)
                        await message.add_reaction(random_check_mark)

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
