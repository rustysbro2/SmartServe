const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const crypto = require('crypto');

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
  clientID: 'YOUR_DISCORD_CLIENT_ID',
  clientSecret: 'YOUR_DISCORD_CLIENT_SECRET',
  callbackURL: 'YOUR_CALLBACK_URL',
  scope: ['identify']
}, (accessToken, refreshToken, profile, done) => {
  // Verify and retrieve user data
  // Replace this with your own implementation
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
  // Replace this with your own implementation
  const user = {
    id: id,
    username: 'exampleUser' // Replace with actual username retrieval
  };

  done(null, user);
});

// Initialize Passport and restore authentication state, if any
app.use(passport.initialize());
app.use(passport.session());

// Define routes
app.get('/', (req, res) => {
  res.send('Welcome to the homepage');
});

app.get('/login', passport.authenticate('discord'));

app.get('/callback', passport.authenticate('discord', {
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

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
