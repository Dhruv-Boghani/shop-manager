const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth(), // saves login session
});

client.on('qr', (qr) => {
  console.log("📲 Scan the QR Code below:");
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log("✅ WhatsApp Client is ready!");
});

client.initialize();

module.exports = client;
