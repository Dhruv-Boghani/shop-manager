const { MongoClient } = require("mongodb");
const makeWASocket = require("@whiskeysockets/baileys").default;
const qrcode = require("qrcode");
const { default: pino } = require("pino");
const mongoose = require("mongoose");

let sock;

// MongoDB session loading
async function loadSession() {
    const session = await mongoose.connection.db.collection('sessions').findOne({ _id: 'default' });
    return session ? session.session : null;
}

// MongoDB session saving
async function saveSession(session) {
    await mongoose.connection.db.collection('sessions').updateOne(
        { _id: 'default' },
        { $set: { session } },
        { upsert: true }
    );
}

async function connectToWhatsApp() {
    try {
        // Load session from MongoDB
        const sessionData = await loadSession();

        // Create the socket connection using the session
        sock = makeWASocket({
            printQRInTerminal: false, // Show QR code in terminal using qrcode
            logger: pino({ level: "silent" }), // Logging setup (silent to suppress logs)
            auth: sessionData, // Use session for authentication
        });

        // Event: Connection update (handles QR code and connection status)
        sock.ev.on("connection.update", async (update) => {
            const { connection, qr } = update;

            if (qr) {
                console.log("📲 Scan this QR code to login:");
                qrcode.toString(qr, { type: "terminal" }, (err, url) => {
                    if (err) {
                        console.error('❌ Error generating QR code:', err);
                        return;
                    }
                    console.log(url); // Show QR code
                });
            }

            if (connection === "open") {
                console.log("✅ WhatsApp is connected");
            }

            if (connection === "close") {
                const statusCode = update.lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== 401; // Do not reconnect on unauthorized
                console.log("❌ Connection closed. Reconnecting:", shouldReconnect);
                if (shouldReconnect) {
                    await connectToWhatsApp(); // Reconnect if necessary
                }
            }
        });

        // Event: Credentials update (save the new creds to MongoDB)
        sock.ev.on("creds.update", saveSession);

    } catch (error) {
        console.error('❌ Error in WhatsApp connection:', error);
    }
}

// Initialize connection
connectToWhatsApp();

module.exports = {
    getClient: () => sock, // Export socket instance for use in other parts
};
