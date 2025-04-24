const { Client } = require('whatsapp-web.js');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');

// 📄 Session schema
const SessionSchema = new mongoose.Schema({
    _id: String,
    session: Buffer,
});
const Session = mongoose.model('Session', SessionSchema);

// 🌐 Load session from MongoDB
async function loadSession() {
    const sessionDoc = await Session.findById('default');
    return sessionDoc ? sessionDoc.session : null;
}

// 💾 Save session to MongoDB
async function saveSession(session) {
    await Session.findByIdAndUpdate(
        'default',
        { session },
        { upsert: true, new: true }
    );
}

// 🧠 Main
(async () => {
    const sessionData = await loadSession();

    const client = new Client({
        session: sessionData ? JSON.parse(sessionData.toString()) : undefined,
    });

    client.on('qr', qr => {
        console.log('Scan this QR:');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('✅ WhatsApp is ready');
    });

    client.on('authenticated', async (session) => {
        console.log('🔐 Authenticated, saving session...');
        await saveSession(Buffer.from(JSON.stringify(session)));
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ Auth failed:', msg);
    });

    client.on('disconnected', (reason) => {
        console.log('⚠️ Disconnected:', reason);
    });

    await client.initialize();
})();
