const express = require('express');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR above to authenticate');
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');
});

client.initialize();

app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    const chatId = `${number}@c.us`; // For international format
    try {
        await client.sendMessage(chatId, message);
        res.send({ success: true, message: 'Message sent!' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send({ success: false, message: 'Failed to send' });
    }
});

app.listen(3001, () => {
    console.log('API server listening on http://localhost:3001');
});
