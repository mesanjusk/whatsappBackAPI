const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Or replace with your frontend URL
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

// ✅ Socket.IO events
io.on('connection', (socket) => {
  console.log('🟢 Frontend connected via socket');

  socket.on('disconnect', () => {
    console.log('🔴 Socket disconnected');
  });
});

// ✅ WhatsApp Events
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

// ✅ REST API to send WhatsApp message (via POST or GET)
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

// ✅ GET API for browser-style testing
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
    console.error('❌ Failed to send message (GET):', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// ✅ Auto-reply logic (does not interfere with existing features)
client.on('message', async (message) => {
  try {
    console.log(`Received message: ${message.body}`);  // Log the incoming message

    // Check for 'hi' and 'order' in a case-insensitive manner
    if (message.body.toLowerCase() === 'hi') {
      await message.reply('Hello! How can I help you?');
    } else if (message.body.toLowerCase() === 'order') {
      await message.reply('Please visit our website to place an order.');
    }

    // Add more keywords if necessary
    // You can create a switch or if-else block to handle other custom auto-replies

  } catch (err) {
    console.error('Auto-reply error:', err);
  }
});


// ✅ Initialize WhatsApp client
client.initialize();

// ✅ Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
