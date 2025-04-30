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

// Optional if you want to test REST API
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

client.initialize();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
