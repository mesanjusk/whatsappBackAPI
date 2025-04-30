// index.js
import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Client, RemoteAuth } from 'whatsapp-web.js';
import MongoStore from 'wwebjs-mongo';

dotenv.config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'));

const store = new MongoStore({ mongoose: mongoose });
const client = new Client({
  authStrategy: new RemoteAuth({
    store,
    backupSyncIntervalMs: 300000
  }),
  puppeteer: {
    args: ['--no-sandbox']
  }
});

client.on('qr', (qr) => {
  console.log('QR RECEIVED');
  io.emit('qr', qr);
});

client.on('ready', () => {
  console.log('Client is ready!');
  io.emit('ready');
});

client.on('authenticated', () => {
  console.log('Client is authenticated');
});

client.on('auth_failure', () => {
  console.log('AUTH FAILURE');
});

client.initialize();

app.get('/', (req, res) => res.send('WhatsApp API Running'));

app.get('/status', (req, res) => {
  const isReady = client.info ? true : false;
  res.json({ isReady });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
