import discord
from discord.ext import commands
import mysql.connector
import logging

logging.basicConfig(level=logging.DEBUG)

bot_token = 'MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY'
intents = discord.Intents.all()
bot = commands.Bot(command_prefix='!', intents=intents)
mydb = {}

@bot.event
async def on_ready():
    print('Bot is ready.')

@bot.command()
async def set_channel(ctx, channel: discord.TextChannel):
    channel_id = channel.id
    mycursor = mydb.cursor()
    mycursor.execute(f"INSERT INTO GameData (name, value) VALUES ('channel', {channel_id})")
    mydb.commit()
    logging.info(f'Successfully set channel id {channel_id}')
    await ctx.send(f'Successfully set channel to {channel.mention}')

@bot.command()
async def increment(ctx, incr: int):
    mycursor = mydb.cursor()
    mycursor.execute("REPLACE INTO GameData (name, value) VALUES (%s, %s)", ('increment', str(incr)))
    mydb.commit()
    await ctx.send(f'Increment set to: {incr}')

async def on_message(message):
    await bot.process_commands(message)
    if message.author == bot.user:
        return

    guild_id = message.guild.id
    mycursor = get_cursor(guild_id)

    mycursor.execute("SELECT value FROM GameData WHERE name = 'channel' AND guild = %s", (guild_id,))
    channel_id = mycursor.fetchone()
    if channel_id is None or message.channel.id != int(channel_id[0]):
        mycursor.fetchall()  # ensure all results are fetched
        return

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('increment',))
    result = mycursor.fetchone()
    if result is not None:
        increment = int(result[0])
    else:
        increment = 0  # default value, adjust as needed

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('count',))
    result = mycursor.fetchone()
    if result is not None:
        count = int(result[0])
    else:
        count = 0  # default value, adjust as needed

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('last_user',))
    result = mycursor.fetchone()
    if result is not None:
        last_user = result[0]
    else:
        last_user = 0  # default value, adjust as needed

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('high_score',))
    result = mycursor.fetchone()
    if result is not None:
        high_score = int(result[0])
    else:
        high_score = 0  # default value, adjust as needed

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

def get_cursor(guild_id):
    if guild_id not in mydb:
        mydb[guild_id] = mysql.connector.connect(
            host="na03-sql.pebblehost.com",
            user="customer_491521_counting",
            password="-se$R-7q9x$O-a5UMA#A",
            database="customer_491521_counting"
        )
    return mydb[guild_id].cursor()


async def fail_game(reason, message):
    mycursor = mydb.cursor()
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



