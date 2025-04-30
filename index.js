// index.js
const { Client, RemoteAuth } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
  }
});

app.use(cors());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const store = new MongoStore({ mongoose });

const client = new Client({
  authStrategy: new RemoteAuth({
    store,
    backupSyncIntervalMs: 300000 // 5 minutes
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

let needsLogin = false;

// WebSocket Events
io.on('connection', (socket) => {
  console.log('Client connected');
  if (needsLogin) socket.emit('qr', 'NEEDS_LOGIN');

  client.on('qr', (qr) => {
    console.log('QR RECEIVED');
    needsLogin = true;
    socket.emit('qr', qr);
  });

  client.on('ready', () => {
    console.log('WhatsApp ready');
    needsLogin = false;
    socket.emit('ready');
  });
});

client.on('disconnected', (reason) => {
  console.log('WhatsApp disconnected:', reason);
  needsLogin = true;
});

client.initialize();

// API to check login status
app.get('/whatsapp-status', (req, res) => {
  res.json({ needsLogin });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
