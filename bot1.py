import discord
from discord.ext import commands
from discord_slash import SlashCommand

intents = discord.Intents.default()
intents.typing = False
intents.presences = False

bot = commands.Bot(command_prefix="!", intents=intents)
slash = SlashCommand(bot)

@bot.event
async def on_ready():
    print(f"Bot is ready. Logged in as {bot.user}")

@slash.slash(name="hello", description="Say hello to the bot")
async def hello(ctx: discord.SlashContext):
    await ctx.send("Hello, world!")

@slash.slash(name="echo", description="Echoes a message")
async def echo(ctx: discord.SlashContext, message: str):
    await ctx.send(message)

@slash.slash(name="add", description="Adds two numbers")
async def add_numbers(ctx: discord.SlashContext, number1: int, number2: int):
    result = number1 + number2
    await ctx.send(f"The sum of {number1} and {number2} is {result}")


bot.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY')



