// index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const { Client, RemoteAuth } = require('whatsapp-web.js');
const cors = require('cors');
const mongoose = require('mongoose');
const MongoStore = require('wwebjs-mongo');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// RemoteAuth Setup
const store = new MongoStore({ mongoose: mongoose });
const client = new Client({
  authStrategy: new RemoteAuth({
    store,
    backupSyncIntervalMs: 300000, // 5 mins
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('🟢 Frontend connected via socket');
  socket.on('disconnect', () => {
    console.log('🔴 Socket disconnected');
  });
});

// WhatsApp Events
client.on('qr', async (qr) => {
  const qrImageUrl = await qrcode.toDataURL(qr);
  console.log('📲 QR code received, sending to frontend');
  io.emit('qr', qrImageUrl);
});

client.on('ready', () => {
  console.log('✅ WhatsApp client is ready!');
  io.emit('ready', true);
});

client.on('authenticated', () => {
  console.log('🔐 WhatsApp authenticated');
});

client.on('auth_failure', msg => {
  console.error('❌ Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
  console.log('❌ Client disconnected:', reason);
  io.emit('disconnected', reason);
});

// REST API to send message
app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;
  if (!number || !message) {
    return res.status(400).json({ error: 'Number and message are required' });
  }
  const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
  try {
    await client.sendMessage(chatId, message);
    res.status(200).json({ success: true, message: 'Message sent' });
  } catch (error) {
    console.error('❌ Failed to send message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

client.initialize();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
