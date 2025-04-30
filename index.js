require('dotenv').config();
const express = require('express');
const { Client, RemoteAuth } = require('whatsapp-web.js');
const MongoStore = require('wwebjs-mongo').MongoStore;
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');

const app = express();
const port = process.env.PORT || 5000;

(async () => {
  try {
    // ✅ Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // ✅ Session store using wwebjs-mongo
    const store = new MongoStore({ mongoose });

    // ✅ WhatsApp Client with RemoteAuth
    const client = new Client({
      authStrategy: new RemoteAuth({
        store,
        backupSyncIntervalMs: 300000,
        clientId: 'my-client'
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    client.on('qr', (qr) => {
      console.log('📱 Scan this QR code:');
      qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
      console.log('✅ WhatsApp client is ready!');
    });

    client.on('authenticated', () => {
      console.log('🔐 Authenticated');
    });

    client.on('auth_failure', (msg) => {
      console.error('❌ Authentication failure:', msg);
    });

    client.on('disconnected', (reason) => {
      console.log('⚠️ Disconnected:', reason);
    });

    await client.initialize();

    // ✅ Basic route
    app.get('/', (req, res) => {
      res.send('🟢 WhatsApp backend is running!');
    });

    app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
    });

  } catch (error) {
    console.error('❌ Startup Error:', error);
  }
})();
