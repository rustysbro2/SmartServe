import discord
from discord.ext import commands
import mysql.connector
import logging

logging.basicConfig(level=logging.DEBUG)

bot_token = 'MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY'
intents = discord.Intents.all()
bot = commands.Bot(command_prefix='!', intents=intents)
mydb = {}

import mysql.connector

def create_game_data_table(connection):
    cursor = connection.cursor()
    table_exists = False

    # Check if the table exists
    cursor.execute("SHOW TABLES LIKE 'GameData'")
    result = cursor.fetchone()
    if result:
        table_exists = True

    if not table_exists:
        # Create the GameData table
        cursor.execute("""
            CREATE TABLE GameData (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                value VARCHAR(255) NOT NULL,
                guild VARCHAR(255) NOT NULL
            )
        """)
        connection.commit()

    cursor.close()

@bot.command()
async def set_channel(ctx, channel: discord.TextChannel):
    guild_id = ctx.guild.id
    channel_id = channel.id
    mycursor = get_cursor(guild_id)
    mycursor.execute(f"INSERT INTO GameData (name, value, guild) VALUES ('channel', {channel_id}, {guild_id}) ON DUPLICATE KEY UPDATE value={channel_id}")
    mydb[guild_id].commit()
    logging.info(f'Successfully set channel id {channel_id} for guild {guild_id}')
    await ctx.send(f'Successfully set channel to {channel.mention}')


@bot.command()
async def increment(ctx, incr: int):
    mycursor = mydb.cursor()
    mycursor.execute("REPLACE INTO GameData (name, value) VALUES (%s, %s)", ('increment', str(incr)))
    mydb.commit()
    await ctx.send(f'Increment set to: {incr}')

@bot.event
async def on_message(message):
    if message.author == bot.user:
        return

    guild_id = message.guild.id
    mycursor = get_cursor(guild_id)

    mycursor.execute("SELECT value FROM GameData WHERE name = 'channel' AND guild = %s", (guild_id,))
    channel_id = mycursor.fetchone()
    if channel_id is None or message.channel.id != int(channel_id[0]):
        return

    mycursor.fetchall()  # Consume unread results

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('increment',))
    increment_result = mycursor.fetchone()
    mycursor.fetchall()  # Consume unread results
    if increment_result is not None:
        increment = int(increment_result[0])
    else:
        increment = 0  # default value, adjust as needed

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('count',))
    count_result = mycursor.fetchone()
    mycursor.fetchall()  # Consume unread results
    if count_result is not None:
        count = int(count_result[0])
    else:
        count = 0  # default value, adjust as needed

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('last_user',))
    last_user_result = mycursor.fetchone()
    mycursor.fetchall()  # Consume unread results
    if last_user_result is not None:
        last_user = int(last_user_result[0])
    else:
        last_user = 0  # default value, adjust as needed

    mycursor.execute("SELECT value FROM GameData WHERE name = %s", ('high_score',))
    high_score_result = mycursor.fetchone()
    mycursor.fetchall()  # Consume unread results
    if high_score_result is not None:
        high_score = int(high_score_result[0])
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
            mydb[guild_id].commit()
        else:
            await fail_game('Invalid number!', message)
    except Exception as e:
        await fail_game(f'Unexpected error: {e}', message)





@bot.event
async def on_ready():
    print('Bot is ready.')

    # Connect to the database
    mydb[bot.user.id] = mysql.connector.connect(
        host="na03-sql.pebblehost.com",
        user="customer_491521_counting",
        password="-se$R-7q9x$O-a5UMA#A",
        database="customer_491521_counting"
    )

    # Create the GameData table if it doesn't exist
    create_game_data_table(mydb[bot.user.id])  # Use bot.user.id as the key





def get_cursor(guild_id):
    if guild_id not in mydb:
        # Get the connection using the guild ID as the key
        connection = mydb[guild_id]

        # Store the connection using the guild ID as the key
        mydb[guild_id] = connection

    return mydb[guild_id].cursor()


async def fail_game(reason, message):
    guild_id = message.guild.id
    mycursor = get_cursor(guild_id)

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
    mydb[guild_id].commit()


bot.run(bot_token)



