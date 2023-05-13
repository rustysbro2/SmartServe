import discord
from discord.ext import commands

TOKEN2 = "MTEwNzAyNTU3ODA0NzA1ODAzMA.GF_Fha.SAyWXzLjgVNyD-neDi8WOpnuSQbTwSFza_DZ80"

intents = discord.Intents.default()
intents.reactions = True
intents.messages = True
intents.message_content = True

bot2 = commands.Bot(command_prefix='$', intents=intents)

@bot2.event
async def on_ready():
    print(f"Bot2 is ready. Connected as {bot2.user.name}")

# Rest of your bot2 code goes here

bot2.run(TOKEN2)
