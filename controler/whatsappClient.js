const { MongoClient } = require("mongodb");
const { useMongoDBAuthState } = require('@whiskeysockets/baileys-mongo-auth');
const makeWASocket = require("@whiskeysockets/baileys").default;
const qrcode = require("qrcode");
const { default: pino } = require("pino");
const mongoose = require("mongoose");

let sock; // to store the WhatsApp socket

async function connectToWhatsApp() {
    try {
        // Load the MongoDB auth state
        const { state, saveCreds } = await useMongoDBAuthState(mongoose.connection.db);
        
        // Create a new socket with the auth state
        sock = makeWASocket({
            printQRInTerminal: false, // We will display the QR code using the 'qrcode' package
            logger: pino({ level: "silent" }), // You can set the log level as needed
            auth: state, // Pass the loaded auth state
        });

        // Event: Connection update (handles QR code and connection status)
        sock.ev.on("connection.update", async (update) => {
            const { connection, qr } = update;
            
            // Handle QR code display
            if (qr) {
                console.log("📲 Scan this QR code to login:");
                qrcode.toString(qr, { type: "terminal" }, (err, url) => {
                    if (err) {
                        console.error('❌ Error generating QR code:', err);
                        return;
                    }
                    console.log(url);
                });
            }

            // Handle connection open and close states
            if (connection === "open") {
                console.log("✅ WhatsApp is connected");
            }

            if (connection === "close") {
                const statusCode = update.lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== 401; // If error code is 401 (unauthorized), do not reconnect
                console.log("❌ Connection closed. Reconnecting:", shouldReconnect);
                
                // Reconnect if the status is not 401 (unauthorized)
                if (shouldReconnect) {
                    await connectToWhatsApp(); // Try reconnecting
                }
            }
        });

        // Event: Credentials update (save the new creds to MongoDB)
        sock.ev.on("creds.update", saveCreds);

    } catch (error) {
        console.error('❌ Error in WhatsApp connection:', error);
    }
}

// Initialize the connection
connectToWhatsApp();

module.exports = {
    getClient: () => sock, // Export the socket instance for use in other parts of the app
};
