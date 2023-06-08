const express = require('express');
const https = require('https');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const crypto = require('crypto');
const ejs = require('ejs');

const app = express();

// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.protocol === 'http' && req.get('X-Forwarded-Proto') !== 'https') {
    const httpsUrl = `https://${req.headers.host}${req.url}`;
    res.redirect(301, httpsUrl);
  } else {
    next();
  }
});

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

// Define routes
app.get('/', (req, res) => {
  res.render('login.ejs');
});

app.get('/login', passport.authenticate('discord'));

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

// Set the view engine to EJS
app.set('view engine', 'ejs');

// HTTPS and SSL configuration
const options = {
  key: fs.readFileSync('/root/Certs/privae-key.key'), // Replace with the path to your private key file
  cert: fs.readFileSync('/root/Certs/smartserve_cc.crt') // Replace with the path to your SSL certificate file
};

// Start the HTTPS server
const port = 443; // Use the desired HTTPS port

https.createServer(options, app).listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
