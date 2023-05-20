import discord
from discord.ext import commands
import os
import inspect
import tracemalloc
import random
import asyncio
import mysql.connector
from giveaway import Giveaway
from tracking import Tracking
from musicbot import MusicBot

tracemalloc.start()

intents = discord.Intents().all()
bot = commands.Bot(command_prefix='!', intents=intents)

bot.remove_command('help')

# MySQL database connection
db_host = 'your_host'
db_user = 'your_username'
db_password = 'your_password'
db_name = 'your_database_name'

db_connection = mysql.connector.connect(
    host=db_host,
    user=db_user,
    password=db_password,
    database=db_name
)

db_cursor = db_connection.cursor()

# Add your extension names here
extensions = ['musicbot', 'giveaway', 'tracking']

# Emojis lists
check_mark_emojis = ['✅', '☑️', '✔️']
trophy_emojis = ['🏆', '🥇', '🥈', '🥉']


def ensure_table_exists():
    db_cursor.execute("""
        CREATE TABLE IF NOT EXISTS count_data (
            guild_id BIGINT PRIMARY KEY,
            channel_id BIGINT,
            count INT,
            last_counter_id BIGINT,
            high_score INT,
            increment INT,
            pending_increment INT,
            old_increment INT,
            successful_counts INT
        )
    """)
    db_connection.commit()


@bot.event
async def on_ready():
    print(f"We have logged in as {bot.user}")
    await bot.change_presence(activity=discord.Game(name="with commands"))

    await bot.add_cog(Giveaway(bot))  # Add the Giveaway cog
    await bot.add_cog(Tracking(bot))  # Add the Tracking cog
    await bot.add_cog(MusicBot(bot))  # Add the MusicBot cog


async def generate_help_data():
    print("Generating help data...")
    help_data = {
        'Counting': {},
        'Giveaway': {},
        'MusicBot': {},
        'Tracking': {},
    }

    general_commands = []

    for extension in extensions:
        ext = bot.get_cog(extension)
        print(f"Extension: {extension}, Cog: {ext}")
        if ext:
            for command in ext.get_commands():
                if not command.hidden:
                    usage = get_command_usage(command)
                    example = generate_command_example(command)
                    help_data[extension][command.name] = {'usage': usage, 'example': example}
                else:
                    general_commands.append(command)
        else:
            for command in bot.commands:
                if not command.hidden:
                    usage = get_command_usage(command)
                    example = generate_command_example(command)
                    general_commands.append(command)

    help_data['Counting'] = {command.name: {'usage': get_command_usage(command), 'example': generate_command_example(command)} for command in general_commands}

    try:
        for extension, commands_data in help_data.items():
            for command_name, command_data in commands_data.items():
                usage = command_data['usage']
                example = command_data['example']
                db_cursor.execute("""
                    INSERT INTO help_data (extension, command_name, usage, example)
                    VALUES (%s, %s, %s, %s)
                """, (extension, command_name, usage, example))

        db_connection.commit()
        print("Help data generated successfully.")
    except Exception as e:
        print(f"Error generating help data: {e}")


def generate_command_example(command):
    params = inspect.signature(command.callback).parameters.values()
    args = []

    for param in params:
        if param.name not in ['self', 'ctx']:
            if param.default is param.empty:
                args.append(f"<{param.name}>")
            else:
                args.append(f"[{param.name}={param.default}]")

    example = f"!{command.name} {' '.join(args)}"
    return example


@bot.command()
async def help(ctx, command_name: str = None):
    db_cursor.execute("SELECT * FROM help_data")
    help_data = db_cursor.fetchall()

    embed = discord.Embed(title="Bot Help", color=discord.Color.blue())
    embed.set_thumbnail(url=bot.user.avatar.url)
    embed.description = "Welcome to the Bot Help!\nHere are the available commands:"

    cogs = {}
    custom_commands = []

    for data in help_data:
        extension = data[0]
        command_name = data[1]
        usage = data[2]
        example = data[3]

        if extension:
            if extension not in cogs:
                cogs[extension] = []
            cogs[extension].append((command_name, usage, example))
        else:
            custom_commands.append((command_name, usage, example))

    sorted_cogs = sorted(cogs.keys(), key=lambda c: str(c))

    for cog in sorted_cogs:
        cog_name = cog
        embed.add_field(name=f"**{cog_name}**", value="\u200b", inline=False)
        for command_name, usage, example in cogs[cog]:
            embed.add_field(name=f"**{command_name}**", value=f"```{usage}```\nExample: {example}", inline=False)

        # Add space between categories
        embed.add_field(name="\u200b", value="\u200b", inline=False)

    if custom_commands:
        embed.add_field(name="**Custom**", value="\u200b", inline=False)
        for command_name, usage, example in custom_commands:
            embed.add_field(name=f"**{command_name}**", value=f"```{usage}```\nExample: {example}", inline=False)

    if command_name:
        db_cursor.execute("SELECT * FROM help_data WHERE command_name = %s", (command_name,))
        command_data = db_cursor.fetchone()

        if command_data:
            usage = command_data[2]
            example = command_data[3]
            embed.clear_fields()
            embed.add_field(name=f"**{command_name}**", value=f"```{usage}```\nExample: {example}", inline=False)
        else:
            embed.description = f"No information found for command: `{command_name}`"

    embed.set_footer(text="For more information, contact the bot owner.")
    await ctx.send(embed=embed)


@bot.command()
async def set_channel(ctx, channel: discord.TextChannel):
    guild_id = ctx.guild.id
    channel_id = channel.id
    db_cursor.execute("""
        INSERT INTO count_data (guild_id, channel_id)
        VALUES (%s, %s)
        ON DUPLICATE KEY UPDATE channel_id = %s
    """, (guild_id, channel_id, channel_id))
    db_connection.commit()
    await ctx.send(f'Counting channel has been set to {channel.mention}')


@bot.command()
async def set_increment(ctx, new_increment: int):
    guild_id = ctx.guild.id
    db_cursor.execute("""
        UPDATE count_data
        SET pending_increment = %s
        WHERE guild_id = %s
    """, (new_increment, guild_id))
    db_connection.commit()
    await ctx.send(f'Counting increment will be set to {new_increment} after the next failure.')


@bot.event
async def on_message(message):
    await bot.process_commands(message)

    if message.author == bot.user:
        return

    if message.content.startswith('!'):
        return

    guild_id = message.guild.id
    db_cursor.execute("SELECT * FROM count_data WHERE guild_id = %s", (guild_id,))
    count_data = db_cursor.fetchone()

    if not count_data:
        return

    channel_id = count_data[1]
    count = count_data[2]
    last_counter_id = count_data[3]
    increment = count_data[5]
    pending_increment = count_data[6]
    successful_counts = count_data[8]

    if message.channel.id == channel_id:
        fail_reason = ""
        increment_changed = False

        try:
            number = int(message.content)
            expected_number = count + increment

            if number == expected_number:
                if message.author.id != last_counter_id:
                    count += increment
                    last_counter_id = message.author.id
                    successful_counts += 1
                    print(f"Message: {message.content}")
                    print(f"Current count: {count}")
                    print(f"Current increment: {increment}")
                    print(f"Successful counts: {successful_counts}")

                    if successful_counts > count_data[4]:
                        count_data[4] = successful_counts
                        print(f"New high score: {count_data[4]}")
                        random_trophy = random.choice(trophy_emojis)
                        await message.add_reaction(random_trophy)
                    else:
                        random_check_mark = random.choice(check_mark_emojis)
                        await message.add_reaction(random_check_mark)

                    db_cursor.execute("""
                        UPDATE count_data
                        SET count = %s, last_counter_id = %s, successful_counts = %s, high_score = %s
                        WHERE guild_id = %s
                    """, (count, last_counter_id, successful_counts, count_data[4], guild_id))
                    db_connection.commit()
                else:
                    fail_reason = "You can't count two numbers in a row. Let others participate!"
            else:
                fail_reason = "The number doesn't follow the counting sequence."
        except Exception:
            fail_reason = "The text you entered is not a valid number."

        if fail_reason:
            print('Fail reason:', fail_reason)
            await message.add_reaction('❌')
            await message.delete()
            expected_number = count + increment

            count = 0
            last_counter_id = None
            successful_counts = 0

            if pending_increment is not None:
                increment = pending_increment
                pending_increment = None
                increment_changed = True

            print('New game started')

            db_cursor.execute("""
                UPDATE count_data
                SET count = %s, last_counter_id = %s, successful_counts = %s, increment = %s, pending_increment = %s
                WHERE guild_id = %s
            """, (count, last_counter_id, successful_counts, increment, pending_increment, guild_id))
            db_connection.commit()

            old_channel_id = channel_id
            old_channel = bot.get_channel(old_channel_id)
            new_channel = await old_channel.clone(name=old_channel.name)
            channel_id = new_channel.id
            await old_channel.delete()

            db_cursor.execute("""
                UPDATE count_data
                SET channel_id = %s
                WHERE guild_id = %s
            """, (channel_id, guild_id))
            db_connection.commit()

            embed = discord.Embed(
                title="Counting Failure",
                description=f"**Failure Reason:** {fail_reason}\n"
                            f"**You typed:** {message.content}\n"
                            f"**Failed by:** {message.author.mention}\n"
                            f"**Expected Number:** {expected_number}",
                color=discord.Color.red()
            )

            if increment_changed:
                embed.add_field(
                    name="**Increment Changed**",
                    value=f"The increment has changed to {increment}."
                )

            await new_channel.send(embed=embed)
            ping_msg = await new_channel.send(message.author.mention)
            await ping_msg.delete()


ensure_table_exists()
bot.run('your_bot_token')
