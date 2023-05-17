import discord
from discord.ext import commands
import os
import json

intents = discord.Intents().all()
bot = commands.Bot(command_prefix='!', intents=intents)

# the file where we will save our channel id and count
data_file = 'count_data.json'

def ensure_data_file_exists():
    if not os.path.exists(data_file):
        with open(data_file, 'w') as f:
            json.dump({}, f)

@bot.event
async def on_ready():
    print(f'We have logged in as {bot.user}')
    ensure_data_file_exists()

@bot.command()
async def set_channel(ctx, channel: discord.TextChannel):
    data = {
        'channel_id': channel.id,
        'count': 0,
        'last_counter_id': None,  # id of the last user who counted
        'high_score': 0,  # the highest score achieved
        'high_scorer_id': None  # id of the user who has the high score
    }
    with open(data_file, 'w') as f:
        json.dump(data, f)
    await ctx.send(f'Counting channel has been set to {channel.mention}')

@bot.event
async def on_message(message):
    if message.author == bot.user:
        return

    ensure_data_file_exists()

    with open(data_file, 'r') as f:
        data = json.load(f)

    if message.channel.id == data.get('channel_id'):
        if message.content.isdigit():
            if int(message.content) == data['count'] + 1 and message.author.id != data['last_counter_id']:
                data['count'] += 1
                data['last_counter_id'] = message.author.id
                if data['count'] > data['high_score']:
                    data['high_score'] = data['count']
                    data['high_scorer_id'] = message.author.id
                    await message.add_reaction('🏆')  # react with a trophy if a new high score is achieved
                else:
                    await message.add_reaction('✅')
            else:
                data['count'] = 0
                data['last_counter_id'] = None
                await message.add_reaction('❌')
                # delete and recreate the channel
                channel_name = message.channel.name
                position = message.channel.position
                overwrites = message.channel.overwrites
                category = message.channel.category
                await message.channel.delete()
                new_channel = await message.guild.create_text_channel(channel_name, position=position, overwrites=overwrites, category=category)
                data['channel_id'] = new_channel.id
        else:
            await message.delete()

    with open(data_file, 'w') as f:
        json.dump(data, f)

    await bot.process_commands(message)


bot.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY')



