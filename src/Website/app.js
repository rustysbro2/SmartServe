const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const dotenv = require('dotenv');
const session = require('express-session');
const crypto = require('crypto');
const { pool, connection } = require('../database');
const morgan = require('morgan');
const apiLogger = require('./apiLogger');
const { getGuilds } = require('./helpers/discord'); // Import the getGuilds function
const { ensureAuthenticated } = require('./middleware/auth');

const envPath = path.join(__dirname, '../.env');

dotenv.config({ path: envPath });

app.set('view engine', 'ejs');
app.use(morgan('dev'));

const options = {
  key: fs.readFileSync('/root/Certs/private-key.key'),
  cert: fs.readFileSync('/root/Certs/smartserve_cc.crt'),
  ca: fs.readFileSync('/root/Certs/smartserve_cc.ca-bundle'),
};

const port = 443;
const sessionSecret = crypto.randomBytes(32).toString('hex');
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
}));

const encryptionKey = crypto.randomBytes(32);

function encryptEmail(email) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  let encrypted = cipher.update(email, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + encrypted;
}

function decryptEmail(encryptedEmail) {
  try {
    console.log('Encrypted email:', encryptedEmail);
    const iv = Buffer.from(encryptedEmail.slice(0, 32), 'hex');
    console.log('IV:', iv);
    const encryptedText = encryptedEmail.slice(32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting email:', error);
    return 'Email decryption failed';
  }
}

passport.use(new DiscordStrategy({
  clientID: process.env.BOT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
  scope: ['identify', 'email', 'guilds'],
  prompt: 'consent'
}, async (accessToken, refreshToken, profile, done) => {
  const { id, username, email, avatar, guilds } = profile;
  console.log(profile);

  try {
    let user = await pool.query('SELECT * FROM web_users WHERE discordId = ?', [id]);

    if (user.length === 0) {
      const encryptedEmail = encryptEmail(email);
      const result = await pool.query('INSERT INTO web_users (username, email, avatar, accessToken, discordId, guilds) VALUES (?, ?, ?, ?, ?, ?)', [username, encryptedEmail, avatar, accessToken, id, JSON.stringify(guilds)]);
      user = { id: result.insertId, username, email, avatar, accessToken, guilds };
    } else {
      const encryptedEmail = encryptEmail(email);
      await pool.query('UPDATE web_users SET username = ?, email = ?, avatar = ?, accessToken = ?, guilds = ? WHERE discordId = ?', [username, encryptedEmail, avatar, accessToken, JSON.stringify(guilds), id]);
      user = user[0];
      user.accessToken = accessToken;
      user.guilds = guilds;
    }

    user.id = id;
    done(null, user);
  } catch (error) {
    done(error);
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, { discordId: user.discordId, guilds: user.guilds }); // Include guilds information in the serialized user object
});

passport.deserializeUser(async (serializedUser, done) => {
  const { discordId, guilds } = serializedUser;

  try {
    const user = await pool.query('SELECT * FROM web_users WHERE discordId = ?', [discordId]);

    if (user.length === 0) {
      done(null, null);
    } else {
      const decryptedEmail = decryptEmail(user[0].email);
      user[0].email = decryptedEmail;
      user[0].accessToken = user[0].accessToken || null;
      user[0].guilds = guilds; // Assign the guilds information to the user object
      done(null, user[0]);
    }
  } catch (error) {
    done(error);
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(apiLogger);

const indexRoute = require('./routes/index');
const loginRoute = require('./routes/login');
const profileRoute = require('./routes/profile');
const dashboardRoute = require('./routes/dashboardRoute');
const featuresRoute = require('./routes/featuresRoute');
const logoutRoute = require('./routes/logoutRoute');
const aboutRoute = require('./routes/aboutRoute');
const contactRoute = require('./routes/contactRoute');
const serverDetailsRoute = require('./routes/serverDetailsRoute');

// Register the dashboard route
app.use('/dashboard', ensureAuthenticated, dashboardRoute);

app.use('/', indexRoute);
app.use('/login', loginRoute);
app.use('/profile', profileRoute);
app.use('/features', featuresRoute);
app.use('/logout', logoutRoute);
app.use('/about', aboutRoute);
app.use('/contact', contactRoute);
app.use('/dashboard/servers', serverDetailsRoute);

https.createServer(options, app).listen(port, () => {
  console.log(`Server is running on port ${port}`);
});




