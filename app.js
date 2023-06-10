const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const dotenv = require('dotenv');
const session = require('express-session');
const User = require('./models/user'); // Adjust the path based on your file structure

dotenv.config();

const options = {
  key: fs.readFileSync('/root/Certs/private-key.key'),
  cert: fs.readFileSync('/root/Certs/smartserve_cc.crt'),
  ca: fs.readFileSync('/root/Certs/smartserve_cc.ca-bundle'),
};

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
}, (accessToken, refreshToken, profile, done) => {
  const userId = profile.id;
  const username = profile.username;
  const email = profile.email;

  User.findOneAndUpdate({ userId }, { username, email }, { upsert: true })
    .then(() => {
      done(null, profile);
    })
    .catch((err) => {
      done(err);
    });
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
