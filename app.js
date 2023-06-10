// Import required modules
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const dotenv = require('dotenv');
const session = require('express-session');
const User = require('./models/user'); // Adjust the path based on your file structure

// Load environment variables from .env file
dotenv.config();

// Read SSL certificate files
const options = {
  key: fs.readFileSync('/root/Certs/private-key.key'),
  cert: fs.readFileSync('/root/Certs/smartserve_cc.crt'),
  ca: fs.readFileSync('/root/Certs/smartserve_cc.ca-bundle'),
};

// Create an Express application
const app = express();
const port = 443;

// Set up session middleware
app.use(session({
  secret: 'your_session_secret',
  resave: false,
  saveUninitialized: false,
}));

// Configure passport with the Discord strategy
passport.use(new DiscordStrategy({
  clientID: '1107025578047058030',
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: 'https://smartserve.cc/callback',
  scope: ['identify', 'email'],
}, (accessToken, refreshToken, profile, done) => {
  // Handle the user data or authentication logic here

  // Extract user data from the profile object
  const userId = profile.id;
  const username = profile.username;
  const email = profile.email;

  // Perform actions with the user data
  // Example: Save user data to a database
  User.findOneAndUpdate({ userId }, { username, email }, { upsert: true })
    .then(() => {
      // User data handling completed
      // Call the 'done' function to indicate success and pass the user object
      done(null, profile);
    })
    .catch((err) => {
      // Error occurred during user data handling
      // Call the 'done' function with the error to indicate failure
      done(err);
    });
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

app.get('/callback', passport.authenticate('discord', {
  failureRedirect: '/login',
}), (req, res) => {
  // Redirect or handle successful authentication
  res.redirect('/profile');
});

app.get('/profile', (req, res) => {
  // Display the user's profile or perform additional logic
  res.send(req.user);
});

// Start the server
https.createServer(options, app).listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
