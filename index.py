import re
import discord
import json
from discord.ext import commands
import logging

logging.basicConfig(level=logging.INFO)

TOKEN = "MTEwNTU5ODczNjU1MTM4NzI0Nw.GtiAKn.kw5VwWhHxfkgy9HEfWz5a8Dsch6BxU10AywRcE"

intents = discord.Intents.default()
intents.reactions = True
intents.messages = True
intents.message_content = True

bot = commands.Bot(command_prefix='!', intents=intents)

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

bot.help_command = CustomHelpCommand()

last_user = {}
data = {}

def load_data():
    try:
        with open('counting_bot_data.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_data(data):
    with open('counting_bot_data.json', 'w') as f:
        json.dump(data, f, indent=4)
       
data = load_data()


def get_server_data(guild_id):
    guild_id = str(guild_id)
    if guild_id not in data:
        data[guild_id] = {
            'counter': 1,
            'high_score': 0,
            'counting_channel_id': None,
            'increment': 1
        }
    return data[guild_id]

async def reset_channel(channel, error_message, increment_message=None):
    guild_id = str(channel.guild.id)
    server_data = get_server_data(guild_id)

    new_channel = await channel.clone()
    await channel.delete()

    server_data['counter'] = 1
    server_data['counting_channel_id'] = new_channel.id
    last_user[guild_id] = None

    save_data(data)

    await new_channel.send(error_message)
    if increment_message:
        await new_channel.send(increment_message)
    return new_channel

@bot.event
async def on_ready():
    global data
    for guild in bot.guilds:
        get_server_data(guild.id)

    server_count = len(bot.guilds)
    activity_name = f'{server_count} Servers'
    activity = discord.Activity(type=discord.ActivityType.watching, name=activity_name)
    await bot.change_presence(activity=activity)
    
@bot.command(name='increment')
async def increment(ctx, increment_value: int = 1):
    guild_id = str(ctx.guild.id)
    server_data = get_server_data(guild_id)

    server_data['increment'] = increment_value
    save_data(data)
    await ctx.send(f"The increment value has been set to {server_data['increment']}.")

@bot.command(name='set_channel')
@commands.has_permissions(manage_channels=True)
async def set_counting_channel(ctx, channel: discord.TextChannel):
    guild_id = str(ctx.guild.id)
    server_data = get_server_data(guild_id)

    server_data['counting_channel_id'] =     channel.id
    save_data(data)
    await ctx.send(f"Counting channel has been set to {channel.mention}.")

@bot.event
async def on_message(message):
    if message.author == bot.user:
        return

    guild_id = str(message.guild.id)
    server_data = get_server_data(guild_id)

    if server_data.get('counting_channel_id') is None:
        if message.content.startswith(bot.command_prefix):
            await bot.process_commands(message)
        return

    if message.channel.id != server_data.get('counting_channel_id'):
        return

    if message.content.startswith(bot.command_prefix):
        await bot.process_commands(message)
        return

    if guild_id in last_user and message.author.id == last_user[guild_id]:
        error_message = f"Error: {message.author.mention}, you cannot count twice in a row. Wait for someone else to count."
        increment_message = f"The current increment value is {server_data['increment']}."
        channel = await reset_channel(message.channel, error_message + " " + increment_message)
        await channel.send(error_message + " " + increment_message)
        return

    try:
        int_message = int(message.content)
    except ValueError:
        return

    if int_message != server_data['counter']:
        error_message = f"Error: {message.author.mention}, the next number should be {server_data['counter']}. You typed: '{message.content}'."
        increment_message = f"The current increment value is {server_data['increment']}."
        channel = await reset_channel(message.channel, error_message + " " + increment_message)
        await channel.send(error_message + " " + increment_message)
        return

    if server_data['counter'] > server_data['high_score']:
        await message.add_reaction("🏆")
        server_data['high_score'] = server_data['counter']
    else:
        await message.add_reaction("✅")

    server_data['counter'] += server_data['increment']
    last_user[guild_id] = message.author.id

    save_data(data)

    if int_message != server_data['counter']:
        error_message = f"Error: {message.author.mention}, the next number should be {server_data['counter']}. You typed: '{message.content}'. Resetting the game...\n"
        increment_message = f"The current increment value is {server_data['increment']}."
        channel = await reset_channel(message.channel, error_message + increment_message)
        await channel.send(error_message)
        if increment_message:
            await channel.send(increment_message)
        return

    if server_data['counter'] > server_data['high_score']:
        await message.add_reaction("🏆")
        server_data['high_score'] = server_data['counter']
    else:
        await message.add_reaction("✅")

    server_data['counter'] += server_data['increment']
    last_user[guild_id] = message.author.id

    save_data(data)

    
bot.run(TOKEN)


