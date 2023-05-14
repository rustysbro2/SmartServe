import discord
import json
from discord.ext import commands
import logging
import re

TOKEN1 = "MTEwNTU5ODczNjU1MTM4NzI0Nw.Gc2MCb.LXE8ptGi_uQqn0FBzvF461pMBAZUCzyP4nMRtY"

logging.basicConfig(level=logging.INFO)

intents = discord.Intents.default()
intents.reactions = True
intents.messages = True
intents.message_content = True
intents.guilds = True
intents.members = True  # Add this line




bot1 = commands.Bot(command_prefix='!', intents=intents)
bot1.remove_command('help')

class CustomHelpCommand(commands.HelpCommand):
    def get_command_signature(self, command):
        return f"{self.context.prefix}{command.qualified_name} {command.signature}"

    async def send_bot_help(self, mapping):
        embed = discord.Embed(title="Help", color=discord.Color.blue())
        embed.set_thumbnail(url=self.context.bot.user.avatar.url)
        for cog, commands in mapping.items():
            filtered_commands = await self.filter_commands(commands, sort=True)
            if filtered_commands:
                command_signatures = [self.get_command_signature(c) for c in filtered_commands]
                cog_name = getattr(cog, "qualified_name", "Other")
                embed.add_field(name=cog_name, value="\n".join(command_signatures), inline=False)

        await self.get_destination().send(embed=embed)

bot1.help_command = CustomHelpCommand()

last_user = {}
data = {}

def load_data():
    try:
        with open('counting_bot_data.json', 'r') as f:
            loaded_data = json.load(f)
            return loaded_data.get("data", {}), loaded_data.get("last_user", {})
    except FileNotFoundError:
        return {}, {}

def save_data(data, last_user):
    with open('counting_bot_data.json', 'w') as f:
        json.dump({"data": data, "last_user": last_user}, f, indent=4)

data, last_user = load_data()

def get_server_data(guild_id):
    guild_id = str(guild_id)
    if guild_id not in data:
        data[guild_id] = {
            'counter': 1,
            'high_score': 0,
            'counting_channel_id': None,
            'increment': 1
        }
    else:
        server_data = data[guild_id]
        if 'next_increment' not in server_data:
            server_data['next_increment'] = server_data.get('increment', 1)
        else:
            server_data['increment'] = server_data['next_increment']
            del server_data['next_increment']
        if 'increment' not in server_data:
            server_data['increment'] = 1  # Set default value for 'increment' if not present
    return data[guild_id]

async def reset_channel(channel, error_message, increment_message=None, typed_message=None):
    guild_id = str(channel.guild.id)
    server_data = get_server_data(guild_id)

    new_channel = await channel.clone()
    await channel.delete(reason="Resetting channel")  # Delete the channel

    if guild_id in last_user:
        del last_user[guild_id]

    if 'next_increment' in server_data:
        server_data['increment'] = server_data['next_increment']
        del server_data['next_increment']
    elif 'increment' not in server_data:
        server_data['increment'] = 1  # Set default increment value if 'increment' is not set

    server_data['counter'] = server_data['increment']
    server_data['counting_channel_id'] = new_channel.id

    save_data(data, last_user)

    messages = [error_message]
    if increment_message:
        messages.append(increment_message)
    if typed_message:
        messages.append(typed_message)
    combined_message = '\n\n'.join(messages)

    await new_channel.send(combined_message)
    return new_channel


@bot1.event
async def on_ready():
    global data, last_user
    for guild in bot1.guilds:
        get_server_data(guild.id)

        # Get the counting channel for the guild
        server_data = get_server_data(guild.id)
        counting_channel_id = server_data.get('counting_channel_id')
        if counting_channel_id is None:
            continue

        counting_channel = bot1.get_channel(counting_channel_id)
        if counting_channel is None:
            continue

        # Fetch messages from the counting channel
        messages = [message async for message in counting_channel.history(limit=None)]

        # Process each message
        for message in messages:
            if message.author == bot1.user:
                continue

            # Check if the message content is a valid count
            expected_value = server_data['counter']
            try:
                int_message = int(message.content)
            except ValueError:
                error_message = f"Error: {message.author.mention}, you typed an invalid number."
                new_channel = await reset_channel(counting_channel, error_message)
                server_data['counting_channel_id'] = new_channel.id
                save_data(data, last_user)
                continue

            # Check if the count is correct
            if int_message != expected_value:
                error_message = f"Error: {message.author.mention}, the next number should be {expected_value}."
                new_channel = await reset_channel(counting_channel, error_message)
                server_data['counting_channel_id'] = new_channel.id
                save_data(data, last_user)
                continue

            # Check if the same user counted twice in a row
            guild_id = str(guild.id)
            if guild_id in last_user and message.author.id == last_user[guild_id]:
                error_message = f"Error: {message.author.mention}, you cannot count twice in a row."
                new_channel = await reset_channel(counting_channel, error_message)
                server_data['counting_channel_id'] = new_channel.id
                save_data(data, last_user)
                continue

            # Update the counter and last user
            if server_data['counter'] > server_data['high_score']:
                try:
                    await message.add_reaction("🏆")
                except discord.errors.NotFound:
                    pass  # Ignore if the channel or message is not found
                server_data['high_score'] = server_data['counter']
            else:
                try:
                    await message.add_reaction("✅")
                except discord.errors.NotFound:
                    pass  # Ignore if the channel or message is not found
            server_data['counter'] += server_data['increment']
            last_user[guild.id] = message.author.id
            save_data(data, last_user)

    server_count = len(bot1.guilds)
    activity_name = f'{server_count} Servers'
    activity = discord.Activity(type=discord.ActivityType.watching, name=activity_name)
    await bot1.change_presence(activity=activity)
    print(f"Bot1 is ready. Connected to {server_count} servers.")


@bot1.command(name='increment')
async def increment(ctx, increment_value: int = None):
    guild_id = str(ctx.guild.id)
    server_data = get_server_data(guild_id)

    if increment_value is not None:
        if guild_id not in last_user:  # Check if no one has counted yet
            server_data['next_increment'] = increment_value
            save_data(data, last_user)
            await ctx.send(f"The increment value will be set to {increment_value} at the start of the next game.")
        else:
            await ctx.send("The increment value cannot be changed until the current game is completed.")

    save_data(data, last_user)

@bot1.command(name='set_channel')
@commands.has_permissions(manage_channels=True)
async def set_counting_channel(ctx, channel: discord.TextChannel):
    guild_id = str(ctx.guild.id)
    server_data = get_server_data(guild_id)

    server_data['counting_channel_id'] = channel.id
    save_data(data, last_user)
    await ctx.send(f"Counting channel has been set to {channel.mention}.")

@bot1.command(name='test')
async def test(ctx):
    await ctx.send('Test command executed successfully!')

@bot1.command(name='ping')
async def ping(ctx):
    await ctx.send('Pong!')


@bot1.event
async def on_message(message):
    if message.author == bot1.user:
        return

    await bot1.process_commands(message)

    guild_id = str(message.guild.id)
    server_data = get_server_data(guild_id)

    if server_data.get('counting_channel_id') is None or message.channel.id != server_data.get('counting_channel_id'):
        return

    if message.content.startswith(bot1.command_prefix):
        await bot1.process_commands(message)
        return

    if guild_id in last_user and message.author.id == last_user[guild_id]:
        error_message = f"Error: {message.author.mention}, you cannot count twice in a row. Wait for someone else to count."
    else:
        try:
            int_message = int(eval("".join(re.findall(r'\d+|\+|\-|\*|x|\/|\(|\)', message.content.replace('x', '*')))))
        except (ValueError, TypeError, NameError, ZeroDivisionError, SyntaxError):
            error_message = f"Error: {message.author.mention}, you typed an invalid expression or a non-integer."
        else:
            expected_value = server_data['counter']

            if int_message != expected_value:
                error_message = f"Error: {message.author.mention}, the next number should be {expected_value}."
            else:
                if server_data['counter'] > server_data['high_score']:
                    await message.add_reaction("🏆")
                    server_data['high_score'] = server_data['counter']
                else:
                    await message.add_reaction("✅")
                server_data['counter'] += server_data['increment']
                last_user[guild_id] = message.author.id
                save_data(data, last_user)
                await bot1.process_commands(message)  # Process commands here
                return

    increment_message = f"The increment is currently set to {server_data['increment']}."
    typed_message = f"You typed: {message.content}"  # Added the typed message
    new_channel = await reset_channel(message.channel, error_message, increment_message, typed_message)
    server_data['counting_channel_id'] = new_channel.id
    save_data(data, last_user)

    await bot1.process_commands(message)  # Process commands here




@bot1.event
async def on_message_edit(before, after):
    await bot1.process_commands(after)

@bot1.event
async def on_message_delete(message):
    await bot1.process_commands(message)




@bot1.event
async def on_guild_join(guild):
    server_count = len(bot1.guilds)
    activity_name = f'{server_count} Servers'
    activity = discord.Activity(type=discord.ActivityType.watching, name=activity_name)
    await bot1.change_presence(activity=activity)

@bot1.event
async def on_guild_remove(guild):
    server_count = len(bot1.guilds)
    activity_name = f'{server_count} Servers'
    activity = discord.Activity(type=discord.ActivityType.watching, name=activity_name)
    await bot1.change_presence(activity=activity)

    guild_id = str(guild.id)
    if guild_id in data:
        del data[guild_id]
        save_data(data, last_user)
    if guild_id in last_user:
        del last_user[guild_id]
        save_data(data, last_user)

bot1.run(TOKEN1)


