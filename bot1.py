import json
import discord
from discord.ext import commands
import logging
import re

TOKEN1 = "MTEwNTU5ODczNjU1MTM4NzI0Nw.Gc2MCb.LXE8ptGi_uQqn0FBzvF461pMBAZUCzyP4nMRtY"

logging.basicConfig(level=logging.DEBUG)

intents = discord.Intents.default()
intents.reactions = True
intents.messages = True
intents.message_content = True
intents.guilds = True
intents.members = True

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
        return

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
            'previous_count': 0,
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

@bot1.event
async def on_ready():
    print(f'{bot1.user.name} is ready. Connected as {bot1.user.name}')

@bot1.command(name='increment')
async def increment(ctx, increment_value: int = None):
    guild_id = str(ctx.guild.id)
    server_data = get_server_data(guild_id)

    if increment_value is not None:
        server_data['next_increment'] = increment_value
        save_data(data, last_user)
        await ctx.send(f"The increment value will be set to {increment_value} at the start of the next game.")
    else:
        await ctx.send(f"The current increment value is {server_data['increment']}.")

    save_data(data, last_user)

@bot1.command(name='set_channel')
@commands.has_permissions(manage_channels=True)
async def set_counting_channel(ctx, channel: discord.TextChannel):
    guild_id = str(ctx.guild.id)
    server_data = get_server_data(guild_id)

    if server_data['counting_channel_id'] != channel.id:
        server_data['counting_channel_id'] = channel.id
        save_data(data, last_user)
        await ctx.send(f"Counting channel has been set to {channel.mention}.")
    else:
        await ctx.send("The counting channel is already set to that channel.")
        return

async def reset_channel(channel, error_message, increment_message, typed_message):
    logging.info("Resetting channel...")
    logging.info(f"Channel name: {channel.name}")
    logging.info(f"Error message: {error_message}")
    logging.info(f"Increment message: {increment_message}")
    logging.info(f"Typed message: {typed_message}")

    guild = channel.guild
    overwrites = channel.overwrites
    category = channel.category

    original_channel = channel  # Store the reference to the original channel

    try:
        await channel.clone(reason="Counting error", name=channel.name, overwrites=overwrites, category=category)
        await original_channel.delete(reason="Counting error")  # Delete the original channel
        logging.info("Channel deleted.")
    except Exception as e:
        logging.exception(f"Failed to delete channel: {e}")

    new_channel = discord.utils.get(guild.text_channels, name=channel.name)
    error_embed = discord.Embed(title="Counting Error", color=discord.Color.red(), description=f"{error_message}\n\n{increment_message}\n\n{typed_message}")
    await new_channel.send(embed=error_embed)

    return new_channel



@bot1@bot1.event
async def on_message(message):
    if message.author == bot1.user:
        return

    guild_id = str(message.guild.id)
    server_data = get_server_data(guild_id)

    if server_data.get('counting_channel_id') is None or message.channel.id != server_data.get('counting_channel_id'):
        await bot1.process_commands(message)
        return

    if message.content.startswith(bot1.command_prefix):
        await bot1.process_commands(message)
        return

    logging.debug(f"Received message: {message.content}")

    if guild_id in last_user and message.author.id == last_user[guild_id]:
        error_message = f"Error: {message.author.mention}, you cannot count twice in a row. Wait for someone else to count."
        ping_message = await message.channel.send(error_message)
        await ping_message.delete()  # Deletes the message immediately
        return
    else:
        try:
            int_message = int(eval("".join(re.findall(r'\d+|\+|\-|\*|x|\/|\(|\)', message.content.replace('x', '*')))))
        except (ValueError, TypeError, NameError, ZeroDivisionError, SyntaxError):
            error_message = f"Error: {message.author.mention}, you typed an invalid expression or a non-integer."
        else:
            expected_value = server_data['counter']

            if int_message != expected_value:
                error_message = f"Error: {message.author.mention}, the next number should be {expected_value}."
                # Reset the counter after the game fails
                server_data['counter'] = 1
            else:
                if server_data['counter'] > server_data['high_score']:
                    await message.add_reaction("🏆")
                    server_data['high_score'] = server_data['counter']
                else:
                    await message.add_reaction("✅")
                server_data['counter'] += server_data['increment']
                last_user[guild_id] = message.author.id
                save_data(data, last_user)
                await bot1.process_commands(message)
                return

    increment_message = f"The increment is currently set to {server_data['increment']}."
    typed_message = f"You typed: {message.content}"
    new_channel = bot1.loop.create_task(reset_channel(message.channel, error_message, increment_message, typed_message))
    server_data['counting_channel_id'] = new_channel.id
    save_data(data, last_user)

    logging.debug("Resetting the channel...")
    logging.debug(f"Channel name: {message.channel.name}")
    logging.debug(f"Error message: {error_message}")
    logging.debug(f"Increment message: {increment_message}")
    logging.debug(f"Typed message: {typed_message}")

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
