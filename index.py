import re
import discord
import json
from discord.ext import commands
import logging

logging.basicConfig(level=logging.INFO)

TOKEN = "MTEwNTU5ODczNjU1MTM4NzI0Nw.G5Va7Y.oVou9CdPnBcPqJc_uKrM2QaAiDoJgVtDMImryU"

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
        json.dump(data, f)

def get_server_data(guild_id):
    if guild_id not in data:
        data[guild_id] = {
            'counter': 1,
            'high_score': 0,
            'counting_channel_id': None,
            'increment': 1
        }
    return data[guild_id]

async def reset_channel(channel, error_message, increment_message=None):
    guild_id = channel.guild.id
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

data = load_data()

@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')

@bot.command(name='increment')
async def increment(ctx, increment_value: int = 1):
    guild_id = ctx.guild.id
    server_data = get_server_data(guild_id)

    server_data['increment'] = increment_value
    save_data(data)
    await ctx.send(f"The increment value has been set to {server_data['increment']}.")

@bot.command(name='set_channel')
@commands.has_permissions(manage_channels=True)
async def set_counting_channel(ctx, channel: discord.TextChannel):
    guild_id = ctx.guild.id
    server_data = get_server_data(guild_id)

    server_data['counting_channel_id'] = channel.id
    save_data(data)
    await ctx.send(f"Counting channel has been set to {channel.mention}.")

@bot.event
async def on_message(message):
    if message.author == bot.user:
        return

    guild_id = message.guild.id
    server_data = get_server_data(guild_id)

    if server_data.get('counting_channel_id') is not None and message.channel.id != server_data.get('counting_channel_id'):
        return

    if message.content.startswith(bot.command_prefix):
        await bot.process_commands(message)
        return
   if guild_id in last_user and message.author == last_user[guild_id]:
    await message.add_reaction("❌")
    error_message = f"Error: {message.author.mention}, you cannot count twice in a row. Wait for someone else to count. Resetting the game..."
    increment_message = f"The current increment value is {server_data['increment']}."
    message.channel = await reset_channel(message.channel, error_message, increment_message)
    return

try:
    int_message = int(message.content)
except ValueError:
    return

if int_message != server_data['counter']:
    await message.add_reaction("❌")
    error_message = f"Error: {message.author.mention}, the next number should be {server_data['counter']}. You typed: '{message.content}'. Resetting the game..."
    increment_message = f"The current increment value is {server_data['increment']}."
    message.channel = await reset_channel(message.channel, error_message, increment_message)
    return

if server_data['counter'] > server_data['high_score']:
    await message.add_reaction("🏆")
    server_data['high_score'] = server_data['counter']
else:
    await message.add_reaction("✅")

server_data['counter'] += server_data['increment']
last_user[guild_id] = message.author

if server_data['counting_channel_id'] is None:
    server_data['counting_channel_id'] = message.channel.id

save_data(data)

bot.run(TOKEN)
        
