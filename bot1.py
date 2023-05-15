import discord
from discord.ext import commands
import os

intents = discord.Intents.default()
intents.message_content = True
bot1 = commands.Bot(command_prefix="!", intents=intents)
bot1.remove_command('help')

counting_channels = {}
increments = {}
last_counters = {}
high_scores = {}

@bot1.command()
async def set_channel(ctx, channel: discord.TextChannel):
    counting_channels[ctx.guild.id] = channel.id
    increments[ctx.guild.id] = 1
    last_counters[ctx.guild.id] = None
    high_scores[ctx.guild.id] = 0

    # Save the channel settings
    counting_channels_settings[ctx.guild.id] = {
        "name": channel.name,
        "topic": channel.topic,
        "position": channel.position,
        "permissions": {over.id: over for over in channel.overwrites}
    }

    await ctx.send(f"Counting channel set to {channel.mention}")

async def handle_invalid_count(message, increment, result):
    await message.add_reaction("❌")
    await message.channel.send(
        "Invalid count. The next number should be {}.".format(result + increment)
    )

    # Delete the channel and create a new one with the same settings
    settings = counting_channels_settings[message.guild.id]
    new_channel = await message.guild.create_text_channel(
        name=settings["name"],
        overwrites=settings["permissions"],
        position=settings["position"],
        topic=settings["topic"],
    )

    # Update the counting_channels dictionary
    counting_channels[message.guild.id] = new_channel.id

    # Reset the last counter and high score
    last_counters[message.guild.id] = None
    high_scores[message.guild.id] = 0

@bot1.command()
async def increment(ctx, num: int):
    increments[ctx.guild.id] = num
    await ctx.send(f"Increment changed to {num}")

@bot1.command()
async def reset_count(ctx):
    last_counters[ctx.guild.id] = 0
    high_scores[ctx.guild.id] = 0
    await ctx.send(f"Count reset.")

@bot1.event
async def on_message(message):
    if message.author == bot1.user:
        return

    if message.channel.id == counting_channels.get(message.guild.id):
        increment = increments.get(message.guild.id)
        last_counter = last_counters.get(message.guild.id)

        try:
            count = int(message.content)
        except ValueError:
            return

        if last_counter is not None and count == last_counter + increment:
            await message.add_reaction("✅")
            last_counters[message.guild.id] = count

            if count > high_scores.get(message.guild.id, 0):
                high_scores[message.guild.id] = count
                await message.add_reaction("🏆")
        else:
            await message.add_reaction("❌")
            await message.channel.send(
                f"Invalid count. The next number should be {last_counter + increment}."
            )

    await bot1.process_commands(message)

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
