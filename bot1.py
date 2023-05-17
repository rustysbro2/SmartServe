import discord
from discord.ext import commands
import os
import json

intents = discord.Intents().all()
bot = commands.Bot(command_prefix='!', intents=intents)

# the file where we will save our data
data_file = 'count_data.json'

# the expected keys and their default values
default_data = {
    'channel_id': None,
    'count': 0,
    'last_counter_id': None,
    'high_score': 0,
}

def ensure_data_file_exists():
    if not os.path.exists(data_file):
        with open(data_file, 'w') as f:
            json.dump({}, f, indent=4)

@bot.event
async def on_ready():
    print(f'We have logged in as {bot.user}')
    ensure_data_file_exists()

@bot.command()
async def set_channel(ctx, channel: discord.TextChannel):
    data = default_data.copy()
    data['channel_id'] = channel.id
    ensure_data_file_exists()
    with open(data_file, 'r') as f:
        all_data = json.load(f)
    all_data[str(ctx.guild.id)] = data
    with open(data_file, 'w') as f:
        json.dump(all_data, f, indent=4)
    await ctx.send(f'Counting channel has been set to {channel.mention}')

@bot.event
async def on_message(message):
    await bot.process_commands(message)  # Moved this line here

    if message.author == bot.user:
        return

    ensure_data_file_exists()

    with open(data_file, 'r') as f:
        all_data = json.load(f)

    data = all_data.get(str(message.guild.id))
    if not data:
        return

    if message.channel.id == data.get('channel_id'):
        if message.content.isdigit():
            if int(message.content) == data['count'] + 1 and message.author.id != data['last_counter_id']:
                data['count'] += 1
                data['last_counter_id'] = message.author.id
                if data['count'] > data['high_score']:
                    data['high_score'] = data['count']
                    await message.add_reaction('🏆')
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

    all_data[str(message.guild.id)] = data
    with open(data_file, 'w') as f:
        json.dump(all_data, f, indent=4)


bot.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY')



