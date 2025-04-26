const { useMultiFileAuthState, makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// Set session folder path to Render's persistent disk or custom path.
const sessionPath = path.join('/persistent', 'session');
let sock = null; // global socket instance

// Helper to clear session folder (if needed)
function clearSessionFolder() {
    if (fs.existsSync(sessionPath)) {
        fs.readdirSync(sessionPath).forEach(file => {
            const filePath = path.join(sessionPath, file);
            if (fs.lstatSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            }
        });
        console.log('🧹 Old session files cleared.');
    }
}

// Main connect function
async function connectToWhatsApp() {
    // If you want, you can clear session folder before connecting, or not.
    // clearSessionFolder(); // optional: clear previous session

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        console.log(`Connection status: ${connection}`);

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('Reconnecting to WhatsApp...');
                await connectToWhatsApp();
            } else {
                console.log('Session closed. Please scan QR code again.');
                sock = null;
            }
        }

        if (connection === 'open') {
            console.log('✅ WhatsApp connected successfully!');
        }
    });

    return sock;
}

async function getClient() {
    if (!sock) {
        console.log('🔄 Initializing WhatsApp client...');
        await connectToWhatsApp();
    }
    return sock;
}

module.exports = { connectToWhatsApp, getClient };
