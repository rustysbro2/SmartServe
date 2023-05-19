from flask import Flask, redirect, request, session, url_for
import secrets
import requests

app = Flask(__name__)
app.secret_key = secrets.token_hex(24)
client_id = '1107025578047058030'
client_secret = 'jmK_Ac2yVyNwcV-oNGJUiCeejliCQ64d'
redirect_uri = 'http://194.213.3.18:8000/callback'  # Adjusted Redirect URI
discord_api_url = 'https://discord.com/api/v10'

@app.route('/')
def home():
    if 'discord_token' in session:
        username = get_user_info()
        return '''
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

                .container {{
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    margin: 0 auto;
                    max-width: 600px;
                    padding: 40px;
                }}

                h1 {{
                    color: #333;
                }}

                .welcome-message {{
                    margin-bottom: 20px;
                }}

                .logout-link {{
                    color: #333;
                    text-decoration: none;
                }}

                .button {{
                    display: inline-block;
                    background-color: #4CAF50;
                    border: none;
                    color: white;
                    padding: 10px 20px;
                    text-align: center;
                    text-decoration: none;
                    display: inline-block;
                    font-size: 16px;
                    margin: 4px 2px;
                    cursor: pointer;
                    border-radius: 4px;
                }}

                .input-group {{
                    margin-bottom: 10px;
                }}

                .input-group label {{
                    display: block;
                    margin-bottom: 5px;
                }}

                .input-group input {{
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    box-sizing: border-box;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Welcome, {username}!</h1>
                <p class="welcome-message">Thank you for using the web dashboard.</p>
                <a class="logout-link" href="/logout">Logout</a>
                
                <h2>Send a Message</h2>
                <form method="POST" action="/send-message">
                    <div class="input-group">
                        <label for="recipient">Recipient ID:</label>
                        <input type="text" id="recipient" name="recipient" placeholder="Recipient ID" required>
                    </div>
                    <div class="input-group">
                        <label for="message">Message:</label>
                        <input type="text" id="message" name="message" placeholder="Your message" required>
                    </div>
                    <button class="button" type="submit">Send</button>
                </form>
            </div>
        </body>
        </html>
        '''.format(username=username)
    else:
        return redirect(url_for('login'))  # Redirect to the login page


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


@app.route('/send-message', methods=['POST'])
def send_message():
    recipient = request.form.get('recipient')
    message = request.form.get('message')
    
    headers = {
        'Authorization': f'Bot YOUR_BOT_TOKEN',
        'Content-Type': 'application/json'
    }
    data = {
        'recipient': recipient,
        'message': message
    }
    
    response = requests.post('https://discord.com/api/v10/send-message', headers=headers, json=data)
    
    if response.status_code == 200:
        return 'Message sent successfully!'
    else:
        return 'Failed to send message.'


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
