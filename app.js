const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const DiscordOAuth2 = require('discord-oauth2');

const options = {
  key: fs.readFileSync('/root/Certs/private-key.key'), // Replace with the path to your private key file
  cert: fs.readFileSync('/root/Certs/smartserve_cc.crt'), // Replace with the path to your SSL certificate file
  ca: fs.readFileSync('/root/Certs/smartserve_cc.ca-bundle'), // Replace with the path to your CA bundle file
};

const app = express();
const port = 443;
const oauth = new DiscordOAuth2();

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Set the views directory
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
  const redirectUri = 'https://smartserve.cc/callback'; // Replace with your redirect URI
  const clientId = '1107025578047058030'; // Replace with your client ID

  const authorizationUrl = oauth.generateAuthUrl({
    scope: ['identify', 'email'], // Specify the required scopes
    redirectUri,
    clientId,
  });
  res.redirect(authorizationUrl);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const tokenData = await oauth.tokenRequest({
      code,
      scope: ['identify', 'email'], // Specify the required scopes
    });

    const user = await oauth.getUser(tokenData.access_token);

    // Store the user's data or perform additional logic as needed
    // For demonstration purposes, we'll simply display the user's information
    res.send(user);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred.');
  }
});

https.createServer(options, app).listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
