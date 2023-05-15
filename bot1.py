import discord
from discord.ext import commands
import ast
import operator
import os
import json

intents = discord.Intents.default()
intents.message_content = True
bot1 = commands.Bot(command_prefix="!", intents=intents)
bot1.remove_command("help")

if os.path.isfile('bot_data.json'):
    with open('bot_data.json') as f:
        data = json.load(f)
        counting_channels = {int(guild_id): int(channel_id) for guild_id, channel_id in data['counting_channels'].items()}  # change here
        increments = data['increments']
        last_counters = data['last_counters']
        high_scores = data['high_scores']
        last_counter_users = data['last_counter_users']
else:
    counting_channels = {}
    increments = {}
    last_counters = {}
    high_scores = {}
    last_counter_users = {}


def save_data():
    with open('bot_data.json', 'w') as f:
        json.dump({
            'counting_channels': {str(guild_id): str(channel_id) for guild_id, channel_id in counting_channels.items()},  # change here
            'increments': increments,
            'last_counters': last_counters,
            'high_scores': high_scores,
            'last_counter_users': last_counter_users
        }, f)


@bot1.command()
async def set_channel(ctx, channel: discord.TextChannel):
    counting_channels[ctx.guild.id] = channel.id  # change here
    increments[ctx.guild.id] = 1
    last_counters[ctx.guild.id] = None
    high_scores[ctx.guild.id] = 0
    last_counter_users[ctx.guild.id] = None
    await ctx.send(f"Counting channel set to {channel.mention}")
    save_data()


@bot1.command()
async def increment(ctx, num: int):
    increments[ctx.guild.id] = num
    await ctx.send(f"Increment changed to {num}")
    save_data()


@bot1.event
async def on_message(message):
    print(f"Message received: {message.content}")
    if message.author == bot1.user:
        return

    await bot1.process_commands(message)  # Process commands first

    if not isinstance(message.channel, discord.TextChannel):
        return

    if message.guild.id in increments:
        increment = increments[message.guild.id]
        last_counter = last_counters.get(message.guild.id)  # Get the last counter for the guild, or None if not found
    else:
        return  # Return if counting channel is not set for the guild

    counting_channel_id = counting_channels.get(message.guild.id)  # change here
    if counting_channel_id != message.channel.id:  # change here
        return  # Return if the message is not in the counting channel

    print(f"[DEBUG] Checking count message ({message.content}) in guild ({message.guild.id})")  # Debug message

    is_valid, result = check_counting_message(message.content, increment, last_counter)
    if is_valid:
        if last_counter is not None and message.author.id == last_counter_users.get(message.guild.id):
            await handle_invalid_count(message, increment, "You need to wait for someone else to count.")
        else:
            print("Adding checkmark reaction")
            await message.add_reaction("✅")
            last_counters[message.guild.id] = result
            last_counter_users[message.guild.id] = message.author.id
            save_data()

            if message.guild.id in high_scores:
                if result > high_scores[message.guild.id]:
                    high_scores[message.guild.id] = result
                    await message.add_reaction("🏆")
            else:
                high_scores[message.guild.id] = result
                save_data()
    else:
        print("Adding cross reaction")
        await handle_invalid_count(message, increment, result)



@bot1.command()
async def help(ctx):
    embed = discord.Embed(title="Counting Bot Help", description="List of commands for the counting bot:", color=0x00FF00)
    embed.add_field(name="!set_channel [channel]", value="Sets the channel for counting.", inline=False)
    embed.add_field(name="!increment [number]", value="Changes the counting increment.", inline=False)
    await ctx.send(embed=embed)


@bot1.event
async def on_ready():
    print(f'{bot1.user} has connected to Discord!')





bot1.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.Gc2MCb.LXE8ptGi_uQqn0FBzvF461pMBAZUCzyP4nMRtY')
