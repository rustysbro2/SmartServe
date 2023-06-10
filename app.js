const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const dotenv = require('dotenv');
const session = require('express-session');

const options = {
  key: fs.readFileSync('/root/Certs/private-key.key'), // Replace with the path to your private key file
  cert: fs.readFileSync('/root/Certs/smartserve_cc.crt'), // Replace with the path to your SSL certificate file
  ca: fs.readFileSync('/root/Certs/smartserve_cc.ca-bundle'), // Replace with the path to your CA bundle file
};

// Load environment variables from .env file
dotenv.config();
console.log(process.env.CLIENT_SECRET);

const app = express();
const port = 443;

// Set up session middleware if needed
app.use(session({
  secret: 'your_session_secret', // Replace with your desired session secret
  resave: false,
  saveUninitialized: false
}));

// Configure passport with the Discord strategy
passport.use(new DiscordStrategy({
  clientID: '1107025578047058030', // Replace with your client ID
  clientSecret: process.env.CLIENT_SECRET, // Retrieve client secret from environment variable
  callbackURL: 'https://smartserve.cc/callback', // Replace with your callback URL
  scope: ['identify', 'email'] // Specify the required scopes
}, (accessToken, refreshToken, profile, done) => {
  // Handle the user data or authentication logic here
  // ...
}));

// Initialize passport and set up authentication routes
app.use(passport.initialize());
app.use(passport.session());

// Define user serialization and deserialization
passport.serializeUser((user, done) => {
  // Serialize the user object
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  // Deserialize the user object
  done(null, obj);
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Define routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', passport.authenticate('discord'));

app.get('/callback', (req, res, next) => {
  passport.authenticate('discord', (err, user, info) => {
    if (err) {
      console.error('Error during authentication:', err);
      return res.status(500).send('An error occurred during authentication.');
    }

    // Log the access token
    const accessToken = req.query.access_token;
    console.log('Access Token:', accessToken);

    // Continue with the authentication process
    if (!user) {
      console.error('Authentication failed:', info.message);
      return res.redirect('/login');
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Error during login:', loginErr);
        return res.status(500).send('An error occurred during login.');
      }

      // Redirect to the profile page
      return res.redirect('/profile');
    });
  })(req, res, next);
});

app.get('/profile', (req, res) => {
  // Display the user's profile or perform additional logic
  res.send(req.user);
});

https.createServer(options, app).listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
