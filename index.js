const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const { Client, LocalAuth, Buttons } = require('whatsapp-web.js');
const cors = require('cors');

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

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox']
  }
});

// Socket.IO events
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

// ✅ Normal send message API (GET)
app.get('/send-message', async (req, res) => {
  const { number, message } = req.query;

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

// ✅ Send message with buttons (POST)
app.post('/send-button-message', async (req, res) => {
  const { number, message, buttons } = req.body;

  if (!number || !message || !buttons || !Array.isArray(buttons)) {
    return res.status(400).json({ error: 'Number, message and buttons are required' });
  }

  const chatId = number.includes('@c.us') ? number : `${number}@c.us`;

  try {
    const buttonObj = new Buttons(message, buttons.map((btn, i) => ({
      body: btn
    })), 'Choose an option:', '');

    await client.sendMessage(chatId, buttonObj);
    res.status(200).json({ success: true, message: 'Button message sent' });
  } catch (error) {
    console.error('❌ Failed to send button message:', error);
    res.status(500).json({ success: false, error: 'Failed to send button message' });
  }
});

// ✅ Auto reply to incoming messages
client.on('message', async msg => {
  console.log(`📩 Message from ${msg.from}: ${msg.body}`);

  if (msg.body.toLowerCase() === 'hi') {
    msg.reply('Hello! How can I help you?');
  }

  if (msg.body.toLowerCase() === 'help') {
    msg.reply('Available commands:\n1. hi\n2. help');
  }
});

client.initialize();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
