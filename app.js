const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const dotenv = require('dotenv');
const session = require('express-session');
const crypto = require('crypto');
const pool = require('./database');

dotenv.config();

const options = {
  key: fs.readFileSync('/root/Certs/private-key.key'),
  cert: fs.readFileSync('/root/Certs/smartserve_cc.crt'),
  ca: fs.readFileSync('/root/Certs/smartserve_cc.ca-bundle'),
};

const app = express();
const port = 443;

// Generate a random session secret
const sessionSecret = crypto.randomBytes(32).toString('hex');

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Discord authentication strategy
passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
  scope: ['identify', 'email'],
}, async (accessToken, refreshToken, profile, done) => {
  const { id, username, email } = profile;

  try {
    // Check if the user already exists in the database
    let user = await pool.query('SELECT * FROM users WHERE discordId = ?', [id]);

    if (user.length === 0) {
      // User does not exist, insert into the database
      await pool.query('INSERT INTO users (discordId, username, email) VALUES (?, ?, ?)', [id, username, email]);
      user = { discordId: id, username, email };
    } else {
      // User exists, update their username and email
      await pool.query('UPDATE users SET username = ?, email = ? WHERE discordId = ?', [username, email, id]);
      user = user[0];
    }

    // Call the 'done' function to indicate success and pass the user object
    done(null, user);
  } catch (error) {
    // Error occurred during user data handling
    // Call the 'done' function with the error to indicate failure
    done(error);
  }
}));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.discordId);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Retrieve the user from the database based on the discordId
    const user = await pool.query('SELECT * FROM users WHERE discordId = ?', [id]);

    if (user.length === 0) {
      // User not found
      done(null, null);
    } else {
      // User found, pass the user object to 'deserializeUser'
      done(null, user[0]);
    }
  } catch (error) {
    done(error);
  }
});

// Define login route
app.get('/login', (req, res) => {
  res.render('login');
});

// Handle login form submission
app.post('/login', passport.authenticate('discord', {
  failureRedirect: '/login',
}), (req, res) => {
  res.redirect('/dashboard');
});

// Define dashboard route
app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.render('dashboard', { user: req.user });
  } else {
    res.redirect('/login');
  }
});

// Define logout route
app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

https.createServer(options, app).listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
