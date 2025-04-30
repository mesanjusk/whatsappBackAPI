const mongoose = require('mongoose');
const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');

const MONGO_URI = 'mongodb+srv://sanjuahuja:cY7NtMKm8M10MbUs@cluster0.wdfsd.mongodb.net/framme';  // Replace with your MongoDB URI

// Step 1: Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('✅ MongoDB connected');

    // Step 2: Once the connection is successful, initialize MongoStore
    const store = new MongoStore({ mongoose: mongoose });

    // Step 3: Initialize WhatsApp Client
    const client = new Client({
      authStrategy: new RemoteAuth({
        store: store,
        backupSyncIntervalMs: 60000
      }),
      puppeteer: {
        args: ['--no-sandbox'],
        headless: true
      }
    });

    // Step 4: Initialize the client
    client.initialize();

    // Optional: Add event listeners for client events
    client.on('qr', qr => {
      console.log('QR RECEIVED', qr);
    });

    client.on('ready', () => {
      console.log('✅ WhatsApp Client is ready');
    });

    client.on('authenticated', () => {
      console.log('✅ WhatsApp Client authenticated');
    });

    client.on('auth_failure', (msg) => {
      console.error('❌ Authentication failed:', msg);
    });

    client.on('disconnected', () => {
      console.log('❌ WhatsApp Client disconnected');
    });

  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });
