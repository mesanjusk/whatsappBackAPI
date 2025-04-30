const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');

// Initialize Express and HTTP Server
const app = express();
const server = http.createServer(app);

// Enable CORS for frontend (replace * with your domain in production)
app.use(cors());
app.use(express.json());

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // Replace with frontend URL in production
    methods: ['GET', 'POST']
  }
});

// Create WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('🟢 Socket.IO client connected');

  socket.on('disconnect', () => {
    console.log('🔴 Socket.IO client disconnected');
  });
});

// WhatsApp Events
client.on('qr', async (qr) => {
  const qrImageUrl = await qrcode.toDataURL(qr);
  console.log('📲 QR Code generated and sent to frontend');
  io.emit('qr', qrImageUrl);
});

client.on('ready', () => {
  console.log('✅ WhatsApp client is ready');
  io.emit('ready', true);
});

client.on('authenticated', () => {
  console.log('🔐 WhatsApp authenticated');
});

client.on('auth_failure', msg => {
  console.error('❌ Auth failure:', msg);
});

client.on('disconnected', (reason) => {
  console.log('❌ WhatsApp disconnected:', reason);
  io.emit('disconnected', reason);
});

// Send Message API
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

// Start WhatsApp client
client.initialize();

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server started at http://localhost:${PORT}`);
});
