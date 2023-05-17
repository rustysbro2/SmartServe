import discord
from discord.ext import commands

intents = discord.Intents.default()
intents.typing = False
intents.presences = False

bot = commands.Bot(command_prefix="!", intents=intents)


@bot.event
async def on_ready():
    print(f"Bot is ready. Logged in as {bot.user}")


@bot.slash_command()
async def hello(ctx: discord.SlashContext):
    await ctx.send("Hello, world!")


@bot.slash_command()
async def echo(ctx: discord.SlashContext, message: str):
    await ctx.send(message)


@bot.slash_command(name="add")
async def add_numbers(ctx: discord.SlashContext, number1: int, number2: int):
    result = number1 + number2
    await ctx.send(f"The sum of {number1} and {number2} is {result}")


bot.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY')



