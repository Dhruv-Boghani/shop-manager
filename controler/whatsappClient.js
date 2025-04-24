// whatsapp.js
const { Client } = require('whatsapp-web.js');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');

const SessionSchema = new mongoose.Schema({
    _id: String,
    session: Buffer,
});
const Session = mongoose.model('Session', SessionSchema);

async function loadSession() {
    const sessionDoc = await Session.findById('default');
    return sessionDoc ? sessionDoc.session : null;
}

async function saveSession(session) {
    await Session.findByIdAndUpdate(
        'default',
        { session },
        { upsert: true, new: true }
    );
}

let client;

async function initializeClient() {
    const sessionData = await loadSession();

    client = new Client({
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

    client.on('auth_failure', msg => {
        console.error('❌ Auth failure:', msg);
    });

    client.on('disconnected', reason => {
        console.log('⚠️ Client disconnected:', reason);
    });

    await client.initialize();
}

initializeClient();

module.exports = {
    getClient: () => client,
};
