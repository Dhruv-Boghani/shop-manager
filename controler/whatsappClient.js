const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');

// --- Session Schema inside the same file ---
const sessionSchema = new mongoose.Schema({
  _id: { type: String, default: "default" },
  session: Object
});
const Session = mongoose.model("Session", sessionSchema);

let client;

// --- Initialize WhatsApp Web.js ---
async function initWhatsApp() {
  try {
    // Check if session exists in MongoDB
    const existingSession = await Session.findById("default");

    client = new Client({
      authStrategy: new LocalAuth(), // Uses local storage for sessions
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    // Show QR in terminal if no session
    client.on('qr', (qr) => {
      console.log('📲 Scan this QR code to log in:');
      qrcode.generate(qr, { small: true });
    });

    // WhatsApp ready
    client.on('ready', async () => {
      console.log('✅ WhatsApp client is ready');

      // Save auth state to MongoDB
      const sessionData = client.authStrategy.getState();
      await Session.findByIdAndUpdate("default", { session: sessionData }, { upsert: true });
    });

    // Auth failure or disconnected
    client.on('auth_failure', () => console.log('❌ Authentication failure'));
    client.on('disconnected', () => console.log('🔌 WhatsApp client disconnected'));

    await client.initialize();

  } catch (err) {
    console.error('❌ Error starting WhatsApp client:', err);
  }
}

// --- Getter ---
function getClient() {
  return client;
}

module.exports = {
  initWhatsApp,
  getClient
};
