const express = require('express');
const https = require('https');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const crypto = require('crypto');
const ejs = require('ejs');
const path = require('path');

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
  clientSecret: 'WsaWCO4d9Giw2GOTtZL9anGWP0_-01Dp',
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

passport.deserializeUser((id, done) => {
  // Retrieve user data from database or cache
  const user = {
    id: id,
    username: 'exampleUser'
  };

  done(null, user);
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

app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`Welcome, ${req.user.username}!`);
  } else {
    res.redirect('/login');
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
