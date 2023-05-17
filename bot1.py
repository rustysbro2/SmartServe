import discord
from discord.ext import commands
from discord_slash import SlashCommand


bot = commands.Bot(command_prefix='!')
slash = SlashCommand(bot)


@bot.event
async def on_ready():
    print(f'Logged in as {bot.user.name}')


@slash.slash(
    name='count',
    description='Start the counting game.'
)
async def count(ctx):
    await ctx.send('Starting the counting game!')
    await ctx.send('Please start counting from 1.')


@slash.slash(
    name='stop',
    description='Stop the counting game.'
)
async def stop(ctx):
    await ctx.send('Stopping the counting game.')
    # Add logic to stop the counting game


@bot.event
async def on_slash_command_error(ctx, error):
    await ctx.send(f'Error: {str(error)}')


@bot.event
async def on_message(message):
    if not message.author.bot:
        # Add logic to handle counting and validate the next number
        pass

    await bot.process_commands(message)




bot.run('MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY')
