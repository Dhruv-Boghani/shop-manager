const { MongoClient } = require("mongodb");
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMongoDBAuthState } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const { default: pino } = require("pino");
const qrcode = require("qrcode");

const mongoose = require("mongoose");

let sock;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMongoDBAuthState(mongoose.connection.db);

    sock = makeWASocket({
        printQRInTerminal: false, // We will show QR using 'qrcode' package
        logger: pino({ level: "silent" }),
        auth: state,
    });

    // Show QR code
    sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update;
        if (qr) {
            console.log("📲 Scan this QR code to login:");
            qrcode.toString(qr, { type: "terminal" }, (err, url) => {
                console.log(url);
            });
        }
        if (connection === "open") {
            console.log("✅ WhatsApp is connected");
        }
        if (connection === "close") {
            const shouldReconnect = (update.lastDisconnect?.error as Boom)?.output?.statusCode !== 401;
            console.log("❌ Connection closed. Reconnecting:", shouldReconnect);
            if (shouldReconnect) {
                await connectToWhatsApp();
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

connectToWhatsApp();

module.exports = {
    getClient: () => sock,
};
