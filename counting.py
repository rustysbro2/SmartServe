import discord
from discord.ext import commands
import os
import json
import inspect
import tracemalloc
import random
import asyncio
from giveaway import Giveaway
from tracking import Tracking
from musicbot import MusicBot

tracemalloc.start()

intents = discord.Intents().all()
bot = commands.Bot(command_prefix='!', intents=intents)

bot.remove_command('help')

# the file where we will save our data
data_file = 'count_data.json'
help_data_file = 'help_data.json'  # File to store the help data

# the expected keys and their default values
default_data = {
    'channel_id': None,
    'count': 0,
    'last_counter_id': None,
    'high_score': 0,
    'increment': 1,
    'pending_increment': None,
    'old_increment': 1,
    'successful_counts': 0
}

# Add your extension names here
extensions = ['musicbot', 'giveaway', 'tracking']

# emojis lists
check_mark_emojis = ['✅', '☑️', '✔️']
trophy_emojis = ['🏆', '🥇', '🥈', '🥉']




def ensure_data_file_exists():
    if not os.path.exists(data_file):
        with open(data_file, 'w') as f:
            json.dump({}, f, indent=4)










@bot.event
async def on_ready():
    print(f"We have logged in as {bot.user}")
    await bot.change_presence(activity=discord.Game(name="with commands"))

    await bot.add_cog(Giveaway(bot))  # Add the Giveaway cog
    await bot.add_cog(Tracking(bot))  # Add the Tracking cog
    await bot.add_cog(MusicBot(bot))  # Add the MusicBot cog



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


@bot.command()
async def help(ctx, command_name: str = None):
    embed = discord.Embed(title="Bot Help", color=discord.Color.blue())
    embed.set_thumbnail(url=bot.user.avatar.url)
    embed.description = "Welcome to the Bot Help!\nHere are the available commands:"

    # Get all the commands sorted by cog name
    sorted_commands = sorted(bot.commands, key=lambda c: c.cog_name or "")

    for command in sorted_commands:
        if not command.hidden:
            usage = get_command_usage(command)
            example = generate_command_example(command)

            # Add the command name as a bold header
            embed.add_field(name=f"**{command.name}**", value="", inline=False)

            # Add the command usage in a code block
            embed.add_field(name="Usage:", value=f"```\n{usage}\n```", inline=False)

            # Add the example if available
            if example:
                embed.add_field(name="Example:", value=f"```\n{example}\n```", inline=False)

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
