// backend.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import pkg from 'whatsapp-web.js';
import { MongoStore } from 'wwebjs-mongo';
import { createServer } from 'http';
import { Server } from 'socket.io';

const { Client, RemoteAuth } = pkg;
const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['https://https://sbsgondia.vercel.app', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// CORS middleware for express routes
app.use(cors({
  origin: ['https://https://sbsgondia.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json());

// MongoDB connection URI
const mongoUri = 'mongodb+srv://sanjuahuja:cY7NtMKm8M10MbUs@cluster0.wdfsd.mongodb.net/framee';

// Unique session id (change per client if needed)
const sessionId = 'my-session';

let client;

(async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');

    const store = new MongoStore({
      mongoose,
      collectionName: `whatsapp-${sessionId}`,
    });

    client = new Client({
      authStrategy: new RemoteAuth({
        clientId: sessionId,
        store,
        backupSyncIntervalMs: 300000, // optional backup interval
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    client.on('qr', qr => {
      console.log('QR code received');
      io.emit('qr', qr);
    });

    client.on('ready', () => {
      console.log('WhatsApp Client is ready');
      io.emit('ready');
    });

    client.on('authenticated', () => {
      console.log('Authenticated, session saved to MongoDB');
      io.emit('authenticated');
    });

    client.on('auth_failure', msg => {
      console.error('Auth failure:', msg);
      io.emit('auth_failure', msg);
    });

    client.on('disconnected', reason => {
      console.log('Client disconnected:', reason);
      io.emit('disconnected', reason);
    });

    await client.initialize();

  } catch (error) {
    console.error('Error initializing client:', error);
  }
})();

app.get('/', (req, res) => {
  res.send('WhatsApp Web.js backend with MongoDB RemoteAuth');
});

app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;
  if (!client) return res.status(500).json({ error: 'Client not initialized' });
  if (!number || !message) return res.status(400).json({ error: 'Number and message required' });

  const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;

  try {
    const isRegistered = await client.isRegisteredUser(formattedNumber);
    if (!isRegistered) return res.status(400).json({ error: 'Number not registered on WhatsApp' });

    const msg = await client.sendMessage(formattedNumber, message);
    res.json({ success: true, id: msg.id._serialized });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
