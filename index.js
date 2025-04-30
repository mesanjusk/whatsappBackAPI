const { Client, RemoteAuth } = require('whatsapp-web.js');
const { default: axios } = require('axios');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const QRCode = require('qrcode');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*', // Allow all origins or specify 'https://sbsgondia.vercel.app'
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const MONGO_URI = 'mongodb+srv://sanjuahuja:cY7NtMKm8M10MbUs@cluster0.wdfsd.mongodb.net/framme';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Create session store
const store = new MongoStore({ mongoose: mongoose });

// Create WhatsApp client with RemoteAuth
const client = new Client({
  authStrategy: new RemoteAuth({
    store,
    backupSyncIntervalMs: 300000, // 5 minutes
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox'],
  },
});

// Listen to WebSocket connections
io.on('connection', (socket) => {
  console.log('✅ Client connected');

  // Send QR code when received from client
  client.on('qr', async (qr) => {
    console.log('📲 QR Code Received');
    const qrImage = await QRCode.toDataURL(qr);
    socket.emit('qr', qrImage); // emit image directly to frontend
  });

  client.on('ready', () => {
    console.log('🟢 Client is ready');
    socket.emit('ready', 'WhatsApp is connected');
  });

  client.on('authenticated', () => {
    console.log('🔒 Authenticated');
    socket.emit('authenticated', 'WhatsApp is authenticated');
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failure:', msg);
    socket.emit('auth_failure', msg);
  });

  client.on('disconnected', (reason) => {
    console.warn('⚠️ Client was logged out:', reason);
    socket.emit('disconnected', reason);
  });

  // Handle logout
  socket.on('logout', async () => {
    try {
      await client.logout();
      socket.emit('logged_out', 'You have been logged out');
    } catch (err) {
      console.error('Logout error:', err);
      socket.emit('logout_error', err.message);
    }
  });
});

// API route to send message
app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;
  if (!number || !message) return res.status(400).json({ error: 'Missing number or message' });

  const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
  try {
    const sent = await client.sendMessage(chatId, message);
    return res.status(200).json({ success: true, messageId: sent.id._serialized });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Start client
client.initialize();

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
