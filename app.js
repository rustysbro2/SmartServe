const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const dotenv = require('dotenv');
const session = require('express-session');
const pool = require('./database');

const options = {
  key: fs.readFileSync('/root/Certs/private-key.key'), // Replace with the path to your private key file
  cert: fs.readFileSync('/root/Certs/smartserve_cc.crt'), // Replace with the path to your SSL certificate file
  ca: fs.readFileSync('/root/Certs/smartserve_cc.ca-bundle'), // Replace with the path to your CA bundle file
};

dotenv.config();

const app = express();
const port = 443;

app.use(session({
  secret: 'your_session_secret',
  resave: false,
  saveUninitialized: false,
}));

passport.use(new DiscordStrategy({
  clientID: '1107025578047058030',
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: 'https://smartserve.cc/callback',
  scope: ['identify', 'email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const [user] = await pool.query('SELECT * FROM users WHERE discordId = ?', [profile.id]);

    if (user) {
      // User already exists, update user data if needed
      // ...
    } else {
      // User doesn't exist, create a new user in the database
      const newUser = {
        discordId: profile.id,
        username: profile.username,
        email: profile.email,
      };

      await pool.query('INSERT INTO users SET ?', newUser);
    }

    done(null, profile);
  } catch (err) {
    done(err);
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', passport.authenticate('discord'));

app.get('/callback', passport.authenticate('discord', {
  failureRedirect: '/login',
}), (req, res) => {
  res.redirect('/profile');
});

app.get('/profile', (req, res) => {
  res.send(req.user);
});

https.createServer(options, app).listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
