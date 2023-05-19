import discord
from discord.ext import commands
import requests
from flask import Flask, redirect, request, session, url_for
import secrets
import logging
import threading

app = Flask(__name__)
app.secret_key = secrets.token_hex(24)
client_id = '1107025578047058030'
client_secret = 'jmK_Ac2yVyNwcV-oNGJUiCeejliCQ64d'
redirect_uri = 'http://194.213.3.18:8000/callback'  # Adjusted Redirect URI
discord_api_url = 'https://discord.com/api/v10'

app.logger.setLevel(logging.DEBUG)
logging.basicConfig(level=logging.DEBUG)


def run_flask_app():
    app.run(host='0.0.0.0', port=8000)


def run_discord_bot():
    bot.run('MTEwNzAyNTU3ODA0NzA1ODAzMA.GQpYS0.fzz9XJcHjDqBJfV0ZF3pohzKxsM1OR6-7ClaCM')


# Discord bot setup
intents = discord.Intents.default()
intents.messages = True  # Updated attribute

bot = commands.Bot(command_prefix='!', intents=intents)


@bot.event
async def on_ready():
    print(f'Logged in as {bot.user.name} ({bot.user.id})')


@bot.command()
async def ping(ctx):
    await ctx.send('Pong!')


# Web dashboard setup
@app.route('/')
def home():
    if 'discord_token' in session:
        username = get_user_info()
        return f'''
        <html>
        <head>
            <style>
                body {{
                    background-color: #f0f0f0;
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }}
                
                .container {{
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    padding: 40px;
                    text-align: center;
                }}
                
                h1 {{
                    color: #333;
                    margin-bottom: 20px;
                }}
                
                .welcome-message {{
                    color: #555;
                    font-size: 18px;
                    margin-bottom: 30px;
                }}
                
                .logout-link {{
                    color: #333;
                    text-decoration: none;
                }}
                
                .logout-link:hover {{
                    text-decoration: underline;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Welcome, {username}!</h1>
                <p class="welcome-message">Thank you for using the web dashboard.</p>
                <a class="logout-link" href="/logout">Logout</a>
            </div>
        </body>
        </html>
        '''
    else:
        return '<a href="/login">Login with Discord</a>'



def get_user_info():
    headers = {
        'Authorization': f'Bearer {session["discord_token"]}'
    }
    response = requests.get(f'{discord_api_url}/users/@me', headers=headers)
    if response.status_code == 200:
        json_data = response.json()
        return json_data['username']
    else:
        return 'Unknown User'


if __name__ == '__main__':
    flask_thread = threading.Thread(target=run_flask_app)
    discord_thread = threading.Thread(target=run_discord_bot)

    flask_thread.start()
    discord_thread.start()

    flask_thread.join()
    discord_thread.join()
