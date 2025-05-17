import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import pkg from 'whatsapp-web.js';
import { MongoStore } from 'wwebjs-mongo';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

const { Client, RemoteAuth } = pkg;
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(cors({
  origin: ['https://yourfrontend.onrender.com', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json()); // ✅ Needed for reading JSON request bodies

const mongoUri = 'mongodb+srv://sanjuahuja:cY7NtMKm8M10MbUs@cluster0.wdfsd.mongodb.net/framee';
const sessionId = 'my-session';

let client; // ✅ Declare globally so it’s accessible in routes

mongoose.connect(mongoUri).then(() => {
  console.log('✅ MongoDB connected');

  const store = new MongoStore({
    mongoose: mongoose,
    collectionName: `whatsapp-${sessionId}`
  });

  console.log('MongoStore created');

  client = new Client({
    authStrategy: new RemoteAuth({
      clientId: sessionId,
      store,
      backupSyncIntervalMs: 300000,
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  io.on('connection', socket => {
    console.log('🔌 New client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  client.on('qr', qr => {
    console.log('🟨 QR received');
    io.emit('qr', qr);
  });

  client.on('ready', () => {
    console.log('✅ Client is ready');
    io.emit('ready');
  });

  client.on('authenticated', () => {
    console.log('🔒 Authenticated and session saved in MongoDB');
    io.emit('authenticated');
  });

  client.on('auth_failure', msg => {
    console.error('❌ Auth failure:', msg);
  });

  client.on('disconnected', reason => {
    console.log('❌ Client disconnected:', reason);
  });

  client.initialize();

}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// ✅ Test route
app.get('/', (req, res) => {
  res.send('WhatsApp Web.js with MongoDB & RemoteAuth');
});

// ✅ Send message route
app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;

  if (!client) {
    return res.status(500).json({ error: 'WhatsApp client not initialized yet' });
  }

  if (!number || !message) {
    return res.status(400).json({ error: 'Number and message are required' });
  }

  const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;

  try {
    const isRegistered = await client.isRegisteredUser(formattedNumber);
    if (!isRegistered) {
      return res.status(400).json({ error: 'Number is not registered on WhatsApp' });
    }

    const msg = await client.sendMessage(formattedNumber, message);
    console.log(`✅ Message sent to ${number}`);
    res.status(200).json({ success: true, msgId: msg.id._serialized });
  } catch (error) {
    console.error('❌ Failed to send message:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
