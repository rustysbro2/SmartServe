const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const options = {
  key: fs.readFileSync('/root/Certs/private-key.key'), // Replace with the path to your private key file
  cert: fs.readFileSync('/root/Certs/smartserve_cc.crt'), // Replace with the path to your SSL certificate file
  ca: fs.readFileSync('/root/Certs/smartserve_cc.ca-bundle'), // Replace with the path to your CA bundle file
};

const app = express();
const port = 443;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

https.createServer(options, app).listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
