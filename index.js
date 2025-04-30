import express from 'express';
import mongoose from 'mongoose';
import { Client, RemoteAuth } from 'whatsapp-web.js';
import MongoStore from 'wwebjs-mongo';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI || 'your-mongodb-uri-here';

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

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

client.on('qr', qr => {
  console.log('QR RECEIVED');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.on('authenticated', () => {
  console.log('Authenticated');
});

client.on('auth_failure', msg => {
  console.error('Auth failure', msg);
});

client.on('disconnected', (reason) => {
  console.log('Client was logged out', reason);
});

client.initialize();

app.get('/', (req, res) => {
  res.send('WhatsApp backend is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
