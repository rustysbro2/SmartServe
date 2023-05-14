import discord
from discord.ext import commands
import json

intents = discord.Intents.default()
intents.messages = True
intents.reactions = True

bot1 = commands.Bot(command_prefix='!', intents=intents)


def load_data():
    try:
        with open('counting_bot_data.json', 'r') as f:
            loaded_data = json.load(f)
            return loaded_data.get("data", {}), loaded_data.get("last_user", {})
    except FileNotFoundError:
        return {}, {}

def save_data(data):
    with open('counting_bot_data.json', 'w') as f:
        json.dump(data, f, indent=4)

@bot1.event
async def on_ready():
    print(f'{bot1.user} has connected to Discord!')

@bot1.event
async def on_message(message):
    if message.author == bot1.user:
        return
    
    if message.content.startswith('!'):
        await bot1.process_commands(message)
        return

    data, last_user = load_data()
    server_data = data[str(message.guild.id)]
    counting_channel_id = server_data["counting_channel"]

    if message.channel.id != counting_channel_id:
        return

    if not message.content.isdigit():
        return

    typed_number = int(message.content)
    last_number = server_data["last_number"]
    increment = server_data["increment"]
    next_number = last_number + increment

    if typed_number != next_number:
        error_message = f"The next number should be {next_number}."
        increment_message = f"The increment is currently set to {increment}."
        typed_message = f"You typed: {typed_number}"
        new_channel = await reset_channel(message.channel, message.author.mention, error_message, increment_message, typed_message)
        data[str(message.guild.id)]["counting_channel"] = new_channel.id
        save_data(data)
    else:
        await message.add_reaction("✅")
        data[str(message.guild.id)]["last_number"] = typed_number
        save_data(data)

# Commands

@bot1.command(name='set_increment')
async def set_increment(ctx, value: int):
    if value <= 0:
        await ctx.send('Increment value must be greater than 0.')
        return

    data, _ = load_data()
    server_data = data[str(ctx.guild.id)]
    server_data['increment'] = value
    save_data(data)
    await ctx.send(f'Increment has been set to {value}.')

@bot1.command(name='reset_channel')
async def reset_channel(ctx):
    error_message = "The counting channel has been reset."
    increment_message = ""
    typed_message = ""
    new_channel = await reset_channel(ctx.channel, ctx.author.mention, error_message, increment_message, typed_message)
    data, _ = load_data()
    data[str(ctx.guild.id)]["counting_channel"] = new_channel.id
    save_data(data)

# Helper functions

async def reset_channel(channel, mention, error_message, increment_message, typed_message):
    guild = channel.guild

    overwrites = channel.overwrites
    category = channel.category

    await channel.delete(reason="Counting channel reset")

    new_channel = await guild.create_text_channel(name=channel.name, overwrites=overwrites, category=category)

    error_embed = discord.Embed(title="Counting Error", color=discord.Color.red(), description=f"{mention}, {error_message}")
    if increment_message:
        error_embed.add_field(name="Increment", value=increment_message, inline=False)
    if typed_message:
        error_embed.add_field(name="Typed Number", value=typed_message, inline=False)

    await new_channel.send(embed=error_embed)

if __name__ == "__main__":
    bot_token = "MTEwNTU5ODczNjU1MTM4NzI0Nw.Gc2MCb.LXE8ptGi_uQqn0FBzvF461pMBAZUCzyP4nMRtY"
    bot1.run(bot_token)

  
