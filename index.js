import express from 'express';
import mongoose from 'mongoose';
import whatsapp from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { MongoStore } from 'wwebjs-mongo';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const { Client, RemoteAuth } = whatsapp;

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'your-mongo-connection-string', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// WhatsApp client setup
const store = new MongoStore({ mongoose });
const client = new Client({
  authStrategy: new RemoteAuth({
    store,
    backupSyncIntervalMs: 300000
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', qr => {
  console.log("🔒 QR Code received:");
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp client is ready!');
});

client.on('authenticated', () => {
  console.log('🔐 WhatsApp client authenticated');
});

client.on('auth_failure', msg => {
  console.error('❌ Authentication failed:', msg);
});

client.initialize();

// Simple test route
app.get('/', (req, res) => {
  res.send('✅ WhatsApp API Backend is running');
});

// Send message route
app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;
  try {
    const chatId = number + "@c.us";
    await client.sendMessage(chatId, message);
    res.status(200).json({ success: true, message: '📨 Message sent successfully' });
  } catch (error) {
    console.error("❌ Failed to send message:", error);
    res.status(500).json({ success: false, message: 'Failed to send message', error });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
