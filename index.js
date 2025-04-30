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

// ✅ REST API to send WhatsApp message
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

// ✅ GET API for message sending (e.g., for testing in browser)
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

// ✅ Auto reply with buttons
client.on('message', async (msg) => {
  if (msg.body.toLowerCase() === 'menu') {
    const buttonMessage = new Buttons(
      'Please choose an option:',
      [
        { body: '📦 Order Status' },
        { body: '🧾 Invoice' },
        { body: '📞 Support' }
      ],
      'Main Menu',
      'Select one'
    );

    await client.sendMessage(msg.from, buttonMessage);
  }

  if (msg.body === '📦 Order Status') {
    await msg.reply('✅ Your order is being processed.');
  }
  if (msg.body === '🧾 Invoice') {
    await msg.reply('🧾 Your invoice will be sent shortly.');
  }
  if (msg.body === '📞 Support') {
    await msg.reply('☎️ Connecting you to support...');
  }
});

client.initialize();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
