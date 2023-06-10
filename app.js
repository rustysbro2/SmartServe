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

// Generate and store the secret key in a JSON file
const generateSecretKey = () => {
  const secretKey = crypto.randomBytes(32);
  const secretKeyFile = path.join(__dirname, 'secret-key.json');
  fs.writeFileSync(secretKeyFile, JSON.stringify({ secretKey: secretKey.toString('base64') }));
  return secretKey;
};

// Read the secret key from the JSON file or generate a new one
const secretKeyFile = path.join(__dirname, 'secret-key.json');
let secretKey;
try {
  const data = fs.readFileSync(secretKeyFile, 'utf8');
  const { secretKey: storedSecretKey } = JSON.parse(data);
  if (storedSecretKey) {
    secretKey = Buffer.from(storedSecretKey, 'base64');
  } else {
    secretKey = generateSecretKey();
  }
} catch (err) {
  secretKey = generateSecretKey();
}

// Encryption/decryption key
const encryptionKey = secretKey.slice(0, 32);

// Encrypt email
function encryptEmail(email) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  let encrypted = cipher.update(email, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + encrypted;
}

// Decrypt email
function decryptEmail(encryptedEmail) {
  const iv = Buffer.from(encryptedEmail.slice(0, 32), 'hex');
  const encryptedText = encryptedEmail.slice(32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

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
      const encryptedEmail = encryptEmail(email);
      await pool.query('INSERT INTO users (discordId, username, email) VALUES (?, ?, ?)', [id, username, encryptedEmail]);
      user = { discordId: id, username, email: encryptedEmail };
    } else {
      // User exists, update their username and email
      const encryptedEmail = encryptEmail(email);
      await pool.query('UPDATE users SET username = ?, email = ? WHERE discordId = ?', [username, encryptedEmail, id]);
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

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

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
      const decryptedEmail = decryptEmail(user[0].email);
      user[0].email = decryptedEmail;
      done(null, user[0]);
    }
  } catch (error) {
    done(error);
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Define root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Define login route
app.get('/login', passport.authenticate('discord'));

// Define callback route
app.get('/callback', passport.authenticate('discord', {
  failureRedirect: '/login',
}), (req, res) => {
  res.redirect('/profile');
});

// Define profile route
app.get('/profile', (req, res) => {
  res.send(req.user);
});

// Start the server
https.createServer(options, app).listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
