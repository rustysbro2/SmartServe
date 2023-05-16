import discord
from discord.ext import commands
import mysql.connector
import asyncio
import math
import logging

logging.basicConfig(level=logging.DEBUG)


bot_token = 'MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY'
intents = discord.Intents.all()
bot = commands.Bot(command_prefix='!', intents=intents)


mydb = mysql.connector.connect(
  host="na03-sql.pebblehost.com",
  user="customer_491521_counting",
  password="-se$R-7q9x$O-a5UMA#A",
  database="customer_491521_counting"
)

mycursor = mydb.cursor()
mycursor.execute("CREATE TABLE IF NOT EXISTS GameData (name VARCHAR(255), value VARCHAR(255))")

@bot.command()
async def set_channel(ctx, channel_id: int):
    print(f"set_channel was called with {channel_id}")  # Debugging output
    mycursor.execute("REPLACE INTO GameData (name, value) VALUES (%s, %s)", ('channel', str(channel_id)))
    mydb.commit()
    await ctx.send(f'Counting channel set to: {channel_id}')

@bot.command()
async def increment(ctx, incr: int):
    mycursor.execute("REPLACE INTO GameData (name, value) VALUES (%s, %s)", ('increment', str(incr)))
    mydb.commit()
    await ctx.send(f'Increment set to: {incr}')


@bot.event
async def on_message(message):  
    await bot.process_commands(message) 
    if message.author == bot.user:
        return

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('channel',))
    channel_id = mycursor.fetchone()
    if channel_id is None or message.channel.id != int(channel_id[0]):
        return

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('increment',))
    increment = int(mycursor.fetchone()[0])

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('count',))
    count = int(mycursor.fetchone()[0])

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('last_user',))
    last_user = mycursor.fetchone()[0]

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('high_score',))
    high_score = int(mycursor.fetchone()[0])

    try:
        if message.content.isdigit() and int(message.content) == count + increment:
            if message.author.id == last_user:
                await fail_game('You cannot post twice in a row!', message)
                return

            await message.add_reaction('✅')
            count += increment
            mycursor.execute("REPLACE INTO GameData (name, value) VALUES (%s, %s)", ('count', str(count)))
            mycursor.execute("REPLACE INTO GameData (name, value) VALUES (%s, %s)", ('last_user', str(message.author.id)))
            if count > high_score:
                high_score = count
                mycursor.execute("REPLACE INTO GameData (name, value) VALUES (%s, %s)", ('high_score', str(high_score)))
                await message.add_reaction('🏆')
            mydb.commit()
        else:
            await fail_game('Invalid number!', message)
    except Exception as e:
        await fail_game(f'Unexpected error: {e}', message)
       



async def fail_game(reason, message):
    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('channel',))
    channel_id = int(mycursor.fetchone()[0])
    channel = bot.get_channel(channel_id)

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('increment',))
    increment = int(mycursor.fetchone()[0])

    await channel.delete(reason='Game ended.')
    new_channel = await channel.category.create_text_channel(channel.name)
    await new_channel.send(f'Game ended! Reason: {reason}\nFailed message: {message.content}\nIncrement was: {increment}')
    mycursor.execute("REPLACE INTO GameData (name, value) VALUES (%s, %s)", ('channel', str(new_channel.id)))
    mycursor.execute("REPLACE INTO GameData (name, value) VALUES (%s, %s)", ('count', '0'))
    mycursor.execute("REPLACE INTO GameData (name, value) VALUES (%s, %s)", ('last_user', '0'))
    mydb.commit()

bot.run(bot_token)






