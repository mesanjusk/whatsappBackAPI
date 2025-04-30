const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client } = require('whatsapp-web.js');
const cors = require('cors');

// Initialize Express server
const app = express();
const server = http.createServer(app);

// Configure CORS options
const corsOptions = {
  origin: 'https://sbsgondia.vercel.app',  // Allow frontend from Vercel
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],        // Ensure necessary headers are included
};

const QRCode = require('qrcode');

// Generate the QR code image and send it as a base64 string
QRCode.toDataURL('your-whatsapp-url-or-session-info', (err, qrCodeDataUrl) => {
  if (err) throw err;
  // Send the base64 string to the frontend
  io.emit('qr', qrCodeDataUrl); // Emit the base64 image string
});


// Apply CORS middleware to allow requests from Vercel frontend
app.use(cors(corsOptions));

// Initialize Socket.IO
const io = socketIo(server, {
  cors: corsOptions,  // Apply the same CORS options for Socket.IO
});

// Initialize WhatsApp client
const client = new Client();

// Handle the QR code event
client.on('qr', (qrCode) => {
  console.log('QR Code generated:', qrCode);  // Debugging log
  io.emit('qr', qrCode);  // Emit the QR code to the frontend
});

// Handle the ready event when WhatsApp client is ready
client.on('ready', () => {
  console.log('WhatsApp client is ready!');
  io.emit('ready');  // Emit 'ready' event when WhatsApp is connected
});

// Initialize WhatsApp client
client.initialize();

// Start the server
server.listen(5000, () => {
  console.log('Server running on port 5000');
});
