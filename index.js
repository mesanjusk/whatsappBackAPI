const { Client } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const client = new Client({
  puppeteer: { headless: true },
  authStrategy: new LocalAuth(),
});

client.on('qr', async (qr) => {
  const qrImageUrl = await qrcode.toDataURL(qr);
  io.emit('qr', qrImageUrl); // Send QR to frontend
});

client.on('ready', () => {
  console.log('WhatsApp client is ready!');
  io.emit('ready', true);
});

client.initialize();

server.listen(5000, () => {
  console.log('Server started on port 5000');
});
