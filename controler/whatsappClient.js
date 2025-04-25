// whatsappClient.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    _id: { type: String, default: 'default' },
    session: Object
}, { collection: 'sessions' });

const Session = mongoose.model('Session', sessionSchema); // adjust path if needed

let client;

async function initializeClient() {
  const saved = await Session.findById('default');
  let clientOptions;

  if (saved && saved.session) {
    clientOptions = {
      session: saved.session
    };
  } else {
    console.log("📲 No session found, please scan the QR code.");
  }

  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox']
    },
    ...clientOptions
  });

  client.on('qr', qr => {
    console.log("📲 Scan this QR code:");
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp client is ready');
  });

  client.on('authenticated', async (session) => {
    console.log('🔒 Authenticated successfully');
    console.log('📦 Session Data:', session);
    await Session.findByIdAndUpdate(
      'default',
      { session },
      { upsert: true }
    );
  });

  client.on('auth_failure', msg => {
    console.error('❌ Authentication failed', msg);
  });

  client.on('disconnected', reason => {
    console.log('❌ Client disconnected', reason);
  });

  await client.initialize();
}

function getClient() {
  if (!client) {
    console.log('❗ WhatsApp client not initialized.');
  }
  return client;
}

module.exports = {
  initializeClient,
  getClient
};
