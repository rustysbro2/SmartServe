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
const CryptoJS = require('crypto-js');
const forge = require('node-forge');

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
  const cipher = forge.cipher.createCipher('AES-CBC', encryptionKey);
  cipher.start({ iv: forge.random.getBytesSync(16) });
  cipher.update(forge.util.createBuffer(email, 'utf8'));
  cipher.finish();
  const encrypted = cipher.output;
  return encrypted.toHex();
}

// Decrypt email
function decryptEmail(encryptedEmail) {
  const decipher = forge.cipher.createDecipher('AES-CBC', encryptionKey);
  decipher.start({ iv: forge.random.getBytesSync(16) });
  decipher.update(forge.util.createBuffer(forge.util.hexToBytes(encryptedEmail)));
  decipher.finish();
  const decrypted = decipher.output;
  return decrypted.toString('utf8');
}



passport.use(new DiscordStrategy({
  clientID: '1107025578047058030',
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: 'https://smartserve.cc/callback',
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

app.use(passport.initialize());
app.use(passport.session());

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
