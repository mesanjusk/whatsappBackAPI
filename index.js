const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const { Client, LocalAuth, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // change if needed
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const MONGO_URL = 'mongodb+srv://sanjuahuja:cY7NtMKm8M10MbUs@cluster0.wdfsd.mongodb.net/framme';

mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

const store = new MongoStore({ mongoose: mongoose });

const client = new Client({
  authStrategy: new RemoteAuth({
    store: store,
    backupSyncIntervalMs: 300000,
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox']
  }
});

client.initialize();

io.on('connection', (socket) => {
  console.log('✅ Socket.IO client connected');

  if (client.info && client.info.wid) {
    socket.emit('ready', 'WhatsApp is already authenticated');
  }

  client.on('qr', async (qr) => {
    const qrImage = await qrcode.toDataURL(qr);
    socket.emit('qr', qrImage);
    console.log('📱 QR code sent');
  });

  client.on('ready', () => {
    socket.emit('ready', 'WhatsApp is ready');
    console.log('✅ WhatsApp is ready');
  });

  client.on('authenticated', () => {
    socket.emit('authenticated', 'WhatsApp is authenticated');
    console.log('🔐 WhatsApp is authenticated');
  });

  client.on('disconnected', (reason) => {
    socket.emit('disconnected', reason);
    console.log('⚠️ WhatsApp disconnected:', reason);
  });
});

// Sample API to send a message
app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;
  try {
    const chatId = number + '@c.us';
    await client.sendMessage(chatId, message);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

// Optional logout route
app.get('/logout', async (req, res) => {
  try {
    await client.logout();
    res.send('Logged out');
  } catch (err) {
    res.status(500).send('Logout failed');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
