import re
import discord
import json
from discord.ext import commands
import logging

logging.basicConfig(level=logging.INFO)

TOKEN = "MTEwNTU5ODczNjU1MTM4NzI0Nw.G5exAC.pOs6dIx-lA3WhH-ZcC-6_bZSdypujcquc9uijE"

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

last_user = None
data = {
    'counter': 1,
    'high_score': 0,
    'counting_channel_id': None
}

def is_valid_equation(equation: str) -> bool:
    return bool(re.match("^[0-9+\-*/\s]+$", equation))

def load_data():
    try:
        with open('counting_bot_data.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {
            'counter': 1,
            'high_score': 0,
            'counting_channel_id': None
        }

def save_data(data):
    with open('counting_bot_data.json', 'w') as f:
        json.dump(data, f)

async def reset_channel(channel, error_message):
    global last_user

    new_channel = await channel.clone()
    await channel.delete()

    data['counter'] = 1
    data['counting_channel_id'] = new_channel.id
    last_user = None

    save_data(data)

    await new_channel.send(error_message)
    return new_channel

data = load_data()

@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')

@bot.command(name='increment')
async def increment(ctx):
    global data
    data['counter'] += 1
    save_data(data)
    await ctx.send(f"The counter has been incremented. The current counter value is {data['counter']}.")

@bot.command(name='set_channel')
@commands.has_permissions(manage_channels=True)
async def set_counting_channel(ctx, channel: discord.TextChannel):
    data['counting_channel_id'] = channel.id
    save_data(data)
    await ctx.send(f"Counting channel has been set to {channel.mention}.")

@bot.listen()
async def on_message(message):
    global last_user
    global data

    if message.author == bot.user:
        return

    if data.get('counting_channel_id') is not None and message.channel.id != data.get('counting_channel_id'):
        return

    if message.content.startswith(bot.command_prefix):
                await bot.process_commands(message)
        return

    if message.author == last_user:
        new_channel = await reset_channel(message.channel, f"{message.author.mention}, you cannot send two consecutive numbers. The channel has been reset.")
        return

    try:
        int_message = int(message.content)
    except ValueError:
        return

    if int_message != data['counter']:
        new_channel = await reset_channel(message.channel, f"{message.author.mention}, you were supposed to send {data['counter']}. The channel has been reset.")
        return

    data['counter'] += 1

    if data['counter'] > data['high_score']:
        data['high_score'] = data['counter']
        save_data(data)
        await message.channel.send(f"{message.author.mention} has set a new high score of {data['high_score']}!")

    last_user = message.author

@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.CommandNotFound):
        return
    if isinstance(error, commands.MissingPermissions):
        await ctx.send("You do not have the required permissions to use this command.")
    else:
        raise error

bot.run(TOKEN)

