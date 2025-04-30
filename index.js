// index.js

const express = require('express');
const session = require('express-session');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000;  // Default to 3000 or Render's environment port

// Setup session for WhatsApp Web.js
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',  // Use environment variable for session secret
  resave: false,
  saveUninitialized: true,
}));

// Setup a simple route
app.get('/', (req, res) => {
  res.send('Hello from WhatsApp API!');
});

// Setup WhatsApp client and QR code
const client = new Client();

client.on('qr', (qr) => {
  console.log('QR Code received');
  qrcode.generate(qr, { small: true }); // Display QR code in the terminal
});

client.on('ready', () => {
  console.log('WhatsApp client is ready!');
});

// Listen for incoming messages or add more event listeners here
client.on('message', (message) => {
  console.log(message.body);  // Example of logging incoming messages
});

// Initialize the WhatsApp client
client.initialize();

// Start Express server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
