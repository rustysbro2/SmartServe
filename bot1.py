import discord
from discord.ext import commands
import os
import json

bot = commands.Bot(command_prefix='!')

# the file where we will save our channel id and count
data_file = 'count_data.json'

@bot.event
async def on_ready():
    print(f'We have logged in as {bot.user}')

@bot.command()
async def set_channel(ctx, channel: discord.TextChannel):
    data = {
        'channel_id': channel.id,
        'count': 0,
        'last_counter_id': None  # id of the last user who counted
    }
    with open(data_file, 'w') as f:
        json.dump(data, f)
    await ctx.send(f'Counting channel has been set to {channel.mention}')

@bot.event
async def on_message(message):
    if message.author == bot.user:
        return

    with open(data_file, 'r') as f:
        data = json.load(f)

    if message.channel.id == data['channel_id']:
        if message.content.isdigit():
            if int(message.content) == data['count'] + 1 and message.author.id != data['last_counter_id']:
                data['count'] += 1
                data['last_counter_id'] = message.author.id
                await message.add_reaction('✅')
            else:
                data['count'] = 0
                data['last_counter_id'] = None
                await message.add_reaction('❌')
                # delete and recreate the channel
                position = message.channel.position
                overwrites = message.channel.overwrites
                category = message.channel.category
                await message.channel.delete()
                new_channel = await message.guild.create_text_channel('counting', position=position, overwrites=overwrites, category=category)
                data['channel_id'] = new_channel.id
        else:
            await message.delete()

    with open(data_file, 'w') as f:
        json.dump(data, f)

    await bot.process_commands(message)

bot.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY')



