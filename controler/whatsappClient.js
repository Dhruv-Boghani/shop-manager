const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Use LocalAuth to persist session data
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth' // Folder to store session
    })
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above');
});

client.on('ready', () => {
    console.log('✅ WhatsApp client is ready!');
    // You can now send messages safely
});

client.on('auth_failure', msg => {
    console.error('❌ Authentication failed:', msg);
});

client.on('disconnected', reason => {
    console.log('⚠️ Client was logged out:', reason);
});

client.initialize();
