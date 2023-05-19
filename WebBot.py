import discord
from discord.ext import commands
import requests
import subprocess

# Discord bot setup
intents = discord.Intents.default()
intents.messages = True

bot = commands.Bot(command_prefix='!', intents=intents)


@bot.event
async def on_ready():
    print(f'Logged in as {bot.user.name} ({bot.user.id})')
    # Start the Flask web application
    start_web_app()


@bot.command()
async def ping(ctx):
    latency = bot.latency * 1000  # Convert to milliseconds
    await ctx.send(f'Pong! Latency: {latency:.2f}ms')


def start_web_app():
    # Start the Flask web application as a subprocess
    subprocess.Popen(['python3', 'webapp.py'])


if __name__ == '__main__':
    bot.run('MTEwNzAyNTU3ODA0NzA1ODAzMA.GQpYS0.fzz9XJcHjDqBJfV0ZF3pohzKxsM1OR6-7ClaCM')
