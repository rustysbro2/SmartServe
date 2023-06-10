const express = require('express');
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/root/Certs/private-key.key'), // Replace with the path to your private key file
  cert: fs.readFileSync('/root/Certs/smartserve_cc.crt'), // Replace with the path to your SSL certificate file
  ca: fs.readFileSync('/root/Certs/smartserve_cc.ca-bundle'), // Replace with the path to your CA bundle file
};

const app = express();
const port = 443;

app.get('/', (req, res) => {
  res.send('Welcome to the Discord website!');
});

app.get('/home', (req, res) => {
  res.send('This is the home page.');
});

app.get('/about', (req, res) => {
  res.send('This is the about page.');
});

app.get('/contact', (req, res) => {
  res.send('This is the contact page.');
});

https.createServer(options, app).listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
