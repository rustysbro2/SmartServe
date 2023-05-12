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

last_user = None

default_data = {
    'counter': 1,
    'high_score': 0,
    'counting_channel_id': None,
    'increment': 1
}

def update_data_with_defaults(data):
    for key, value in default_data.items():
        if key not in data:
            data[key] = value
    return data

def load_data():
    try:
        with open('counting_bot_data.json', 'r') as f:
            data = json.load(f)
            updated_data = update_data_with_defaults(data)
            return updated_data
    except FileNotFoundError:
        return default_data.copy()

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
        await message.add_reaction("❌")
        error_message = f"Error: {message.author.mention}, you cannot count twice in a row. Wait for someone else to count. Resetting the game..."
        message.channel = await reset_channel(message.channel, error_message)
        return

    try:
        int_message = int(message.content)
    except ValueError:
        return

    if int_message != data['counter']:
        await message.add_reaction("❌")
        error_message = f"Error: {message.author.mention}, the next number should be {data['counter']}. You typed: '{message.content}'. Resetting the game..."
        message.channel = await reset_channel(message.channel, error_message)
        return

    if data['counter'] > data['high_score']:
        await message.add_reaction("🏆")
    else:
        await message.add_reaction("✅")

    data['counter'] += data['increment']
    last_user = message.author

    if data['counting_channel_id'] is None:
        data['counting_channel_id'] = message.channel.id

    save_data(data)

bot.run(TOKEN)
