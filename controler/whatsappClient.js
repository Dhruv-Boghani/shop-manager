const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth(), // saves login session
});

client.on('qr', (qr) => {
  console.log("📲 Scan the QR Code below:");
  qrcode.generate(qr, { small: false });
});

client.on('ready', () => {
  console.log("✅ WhatsApp Client is ready!");

  // ✅ Now it's safe to send a message
  client.sendMessage('123456789@c.us', 'Hello from the shop system!')
  .then(() => console.log("Message sent!"))
  .catch(console.error);
});

client.initialize();

module.exports = client;
