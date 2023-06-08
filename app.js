const express = require('express');
const https = require('https');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const crypto = require('crypto');
const ejs = require('ejs');
const path = require('path');
const fetch = require('node-fetch');

const app = express();

// Generate a random session secret
const sessionSecret = crypto.randomBytes(32).toString('hex');

// Configure session middleware
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false
}));

// Passport configuration
passport.use(new DiscordStrategy({
  clientID: '1107025578047058030',
  clientSecret: 'tsNaVELoI3cyr6sKNXDvReiL0g2QlzGz',
  callbackURL: 'https://smartserve.cc/auth/discord/callback',
  scope: ['identify']
}, (accessToken, refreshToken, profile, done) => {
  // Verify and retrieve user data
  const user = {
    id: profile.id,
    username: profile.username,
    discriminator: profile.discriminator,
    accessToken: accessToken
  };

  return done(null, user);
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Make a request to the Discord API to retrieve the user's data
    const response = await fetch(`https://discord.com/api/v10/users/${id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.DISCORD_API_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const userData = await response.json();
    const user = {
      id: userData.id,
      username: `${userData.username}#${userData.discriminator}`,
    };

    done(null, user);
  } catch (error) {
    console.error('Error during deserialization:', error);
    done(error, null);
  }
});

// Initialize Passport and restore authentication state, if any
app.use(passport.initialize());
app.use(passport.session());

// Set the views directory
app.set('views', path.join(__dirname, 'views'));

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Define routes
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  const backgroundImageLoaded = true; // Set the value based on whether the background image is successfully loaded

  res.render('login', { backgroundImageLoaded });
});

app.get('/login/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', {
  successRedirect: '/dashboard',
  failureRedirect: '/login'
}));

// Define the route for the dashboard
app.get('/dashboard', (req, res) => {
  // Check if the user is authenticated and retrieve the user data
  if (req.isAuthenticated()) {
    const user = req.user; // Assuming req.user contains the user data
    res.render('dashboard', { user });
  } else {
    res.redirect('/login'); // Redirect to the login page if not authenticated
  }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// HTTPS and SSL configuration
const options = {
  key: fs.readFileSync('/root/Certs/privae-key.key'), // Replace with the path to your private key file
  cert: fs.readFileSync('/root/Certs/smartserve_cc.crt'), // Replace with the path to your SSL certificate file
  ca: fs.readFileSync('/root/Certs/smartserve_cc.ca-bundle') // Replace with the path to your CA bundle file
};

// Start the HTTPS server
const port = 443; // Use the desired HTTPS port

https.createServer(options, app).listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
