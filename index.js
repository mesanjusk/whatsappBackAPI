const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow all or specify your frontend
    methods: ['GET', 'POST']
  }
});

// Connect to MongoDB for session persistence
const mongoUrl = process.env.MONGO_URI || 'mongodb+srv://sanjuahuja:cY7NtMKm8M10MbUs@cluster0.wdfsd.mongodb.net/framme';

mongoose.connect(mongoUrl).then(() => {
  console.log('🟢 MongoDB connected');

  const store = new MongoStore({ mongoose });

  const client = new Client({
    authStrategy: new RemoteAuth({
      store,
      backupSyncIntervalMs: 300000,
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox'],
    }
  });

  io.on('connection', (socket) => {
    console.log('⚡ Client connected');

    client.on('qr', (qr) => {
      console.log('📱 QR RECEIVED');
      socket.emit('qr', qr); // Send base64 to frontend
    });

    client.on('ready', () => {
      console.log('✅ WhatsApp is ready');
      socket.emit('ready');
    });

    client.on('authenticated', () => {
      console.log('🔐 Authenticated');
      socket.emit('authenticated');
    });

    client.on('auth_failure', (msg) => {
      console.error('❌ Authentication failure:', msg);
      socket.emit('auth_failure', msg);
    });

    client.on('disconnected', (reason) => {
      console.log('🔌 Client disconnected', reason);
      socket.emit('disconnected', reason);
    });
  });

  client.initialize();
});

// Base endpoint
app.get('/', (req, res) => {
  res.send('🟢 WhatsApp backend is running');
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
