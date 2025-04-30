const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const mongoose = require('mongoose');

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

// ✅ MongoDB Connection
mongoose.connect('mongodb+srv://sanjuahuja:cY7NtMKm8M10MbUs@cluster0.wdfsd.mongodb.net/framme', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Session Schema for storing WhatsApp credentials
const SessionSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed }
});
const SessionModel = mongoose.models.WhatsAppSession || mongoose.model('WhatsAppSession', SessionSchema);

// ✅ Load session data from DB
async function loadSession() {
  const session = await SessionModel.findOne({ clientId: 'default' });
  return session ? session.data : null;
}

// ✅ Save session data to DB
async function saveSession(sessionData) {
  await SessionModel.findOneAndUpdate(
    { clientId: 'default' },
    { data: sessionData },
    { upsert: true, new: true }
  );
}

// ✅ WhatsApp Client Init
(async () => {
  try {
    const client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox']
      }
    });

    // WebSocket setup
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

    client.on('authenticated', async (session) => {
      console.log('🔐 WhatsApp authenticated');
      await saveSession(session);
    });

    client.on('auth_failure', msg => {
      console.error('❌ Authentication failed:', msg);
    });

    client.on('disconnected', (reason) => {
      console.log('❌ Client disconnected:', reason);
      io.emit('disconnected', reason);
    });

    // ✅ Optional Auto Reply
    client.on('message', async (msg) => {
      if (msg.body === 'hi') {
        msg.reply('Hello! This is an auto-reply.');
      }
    });

    // ✅ REST API for sending message
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

    // ✅ Start WhatsApp client
    client.initialize();
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
})();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
