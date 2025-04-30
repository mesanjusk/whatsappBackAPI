const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const { Client } = require('whatsapp-web.js');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');

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

// ✅ Connect to MongoDB
mongoose.connect('mongodb+srv://sanjuahuja:cY7NtMKm8M10MbUs@cluster0.wdfsd.mongodb.net/framme', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('📦 Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Schema for session
const SessionSchema = new mongoose.Schema({ session: Object });
const SessionModel = mongoose.model('WhatsAppSession', SessionSchema);

// ✅ Load session from DB
async function loadSession() {
  const doc = await SessionModel.findOne();
  return doc?.session || null;
}

// ✅ Save session to DB
async function saveSession(session) {
  await SessionModel.deleteMany(); // clear old session
  await SessionModel.create({ session });
}

let client;

// Initialize WhatsApp client with saved session (if any)
(async () => {
  const sessionData = await loadSession();

  client = new Client({
    session: sessionData,
    puppeteer: {
      headless: true,
      args: ['--no-sandbox']
    }
  });

  // WhatsApp Events
  client.on('qr', async (qr) => {
    const qrImageUrl = await qrcode.toDataURL(qr);
    console.log('📲 QR code received, sending to frontend');
    io.emit('qr', qrImageUrl);
  });

  client.on('authenticated', (session) => {
    console.log('🔐 Authenticated, saving session...');
    saveSession(session);
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp client is ready!');
    io.emit('ready', true);
  });

  client.on('auth_failure', msg => {
    console.error('❌ Authentication failed:', msg);
  });

  client.on('disconnected', async (reason) => {
    console.log('❌ Client disconnected:', reason);
    io.emit('disconnected', reason);
    await SessionModel.deleteMany();
  });

  // Socket.IO
  io.on('connection', (socket) => {
    console.log('🟢 Frontend connected via socket');
    socket.on('disconnect', () => {
      console.log('🔴 Socket disconnected');
    });
  });

  // REST API for sending messages
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
})();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
