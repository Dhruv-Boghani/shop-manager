const makeWASocket = require('@whiskeysockets/baileys').default;
const { useSingleFileAuthState } = require('@whiskeysockets/baileys');
const { MongoClient } = require('mongodb');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const SESSION_FILE_PATH = './auth_info.json';

let sock;

// This function handles all Baileys events and state
async function initializeClient() {
    console.log('🔧 Initializing Baileys WhatsApp client...');

    // Store auth state in file (this works even after Render restarts)
    const { state, saveCreds } = useSingleFileAuthState(SESSION_FILE_PATH);

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Automatically shows QR
        browser: ['Baileys', 'Desktop', '1.0'],
    });

    // Automatically handle QR in console
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('📲 Scan the QR Code below:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('✅ WhatsApp connection established!');
        } else if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            console.log('❌ Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) initializeClient();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    return sock;
}

// Initialize once
initializeClient().catch(err => console.error('❌ Failed to initialize Baileys client:', err));

// Export the client getter
module.exports = {
    getClient: () => sock
};
