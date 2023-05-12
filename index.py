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
    @property
    def clean_prefix(self):
        return self.context.prefix

    def get_command_signature(self, command):
        return f"{self.clean_prefix}{command.qualified_name} {command.signature}"

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
    global data
    print(f'{bot.user} has connected to Discord!')
    counting_channel_id = data.get('counting_channel_id')
    if counting_channel_id is not None:
        channel = bot.get_channel(counting_channel_id)
        if channel is not None:
            print(f"Counting channel is set to {channel.name}.")
        else:
            print("Counting channel not found. Use !set_channel to set a new counting channel.")
    else:
        print("No counting channel set. Use !set_channel to set a counting channel.")


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

    if is_valid_equation(message.content):
        try:
                        message_number = int(eval(message.content))
        except (ValueError, ZeroDivisionError, SyntaxError):
            message_number = None
    else:
        message_number = None

    if message_number is None:
        await message.add_reaction("❌")
        error_message = f"Error: {message.author.mention}, you must type a number or a valid math equation. You typed: '{message.content}'. Resetting the game..."
        message.channel = await reset_channel(message.channel, error_message)
        return

    if message.author == last_user:
        await message.add_reaction("❌")
        error_message = f"Error: {message.author.mention}, you cannot count twice in a row. Wait for someone else to count. You typed: '{message.content}'. Resetting the game..."
        message.channel = await reset_channel(message.channel, error_message)
        return

    if message_number == data['counter']:
        if data['counter'] > data['high_score']:
            data['high_score'] = data['counter']
            await message.add_reaction("🏆")
        else:
            await message.add_reaction("✅")
        data['counter'] += 1
        last_user = message.author
    else:
        await message.add_reaction("❌")
        error_message = f"Error: {message.author.mention}, the next number should be {data['counter']}. You typed: '{message.content}'. Resetting the game..."
        message.channel = await reset_channel(message.channel, error_message)

    if data['counting_channel_id'] is None:
        data['counting_channel_id'] = message.channel.id

    save_data(data)

bot.run(TOKEN)

