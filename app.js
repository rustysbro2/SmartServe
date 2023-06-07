const express = require('express');
const { Client } = require('discord.js');

const app = express();
const client = new Client();

// Website Setup

app.set('view engine', 'ejs');

// Define website routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/about', (req, res) => {
  res.render('about');
});

// Start the server
app.listen(3000, () => {
  console.log('Website running on port 3000');
});
