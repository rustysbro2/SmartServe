import discord
from discord.ext import commands
import requests
from flask import Flask, redirect, request, session, url_for
import secrets
import logging



app = Flask(__name__)
app.secret_key = secrets.token_hex(24)
client_id = '1107025578047058030'
client_secret = 'jmK_Ac2yVyNwcV-oNGJUiCeejliCQ64d'
redirect_uri = 'http://194.213.3.18:8000/callback'  # Adjusted Redirect URI
discord_api_url = 'https://discord.com/api/v10'

app.logger.setLevel(logging.DEBUG)
logging.basicConfig(level=logging.DEBUG)


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
                    text-align: center;
                }}
                
                h1 {{
                    color: #333;
                }}
                
                .container {{
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    margin: 0 auto;
                    max-width: 600px;
                    padding: 40px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Welcome, {username}!</h1>
                <p>Thank you for using the web dashboard.</p>
                <a href="/logout">Logout</a>
            </div>
        </body>
        </html>
        '''
    else:
        return '<a href="/login">Login with Discord</a>'

@app.route('/login')
def login():
    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'identify'
    }
    return redirect(f'{discord_api_url}/oauth2/authorize?{"&".join(f"{k}={v}" for k, v in params.items())}')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('home'))

@app.route('/callback')
def callback():
    code = request.args.get('code')
    data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirect_uri,
        'scope': 'identify'
    }
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    response = requests.post(f'{discord_api_url}/oauth2/token', data=data, headers=headers)
    if response.status_code == 200:
        json_data = response.json()
        session['discord_token'] = json_data['access_token']
        return redirect(url_for('home'))
    else:
        return 'Failed to login with Discord'

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
    app.run(host='0.0.0.0', port=8000, debug=True)
    bot.run('MTEwNzAyNTU3ODA0NzA1ODAzMA.GQpYS0.fzz9XJcHjDqBJfV0ZF3pohzKxsM1OR6-7ClaCM')



