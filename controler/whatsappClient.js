const { useMultiFileAuthState, makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');  // Used for running Python scripts

// Set session folder path
let sessionDownloaded = false; // track if session downloaded from Drive
let sessionPath = path.join(__dirname, '../persistent/session');
let sock = null; // global socket instance
let scanQR = false;
const scriptPath = path.join(__dirname, 'script.py');

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

// Function to run the Python script to download session files from Google Drive
function downloadFromDrive() {
    return new Promise((resolve, reject) => {
        const python = spawn('python', [scriptPath, 'download_from_drive']);

        python.stdout.on('data', (data) => {
            console.log(`Python script output: ${data}`);
        });

        python.stderr.on('data', (data) => {
            console.error(`Python script error: ${data}`);
        });

        python.on('close', (code) => {
            if (code !== 0) {
                reject(`Python script failed with exit code ${code}`);
            } else {
                console.log('Python script executed successfully!');
                resolve();
            }
        });
    });
}

// Function to run the Python script to clear old files and upload new session files to Google Drive
function clearAndUploadToDrive() {
    return new Promise((resolve, reject) => {
        const python = spawn('python', [scriptPath, 'clear_and_upload_to_drive']);

        python.stdout.on('data', (data) => {
            console.log(`Python script output: ${data}`);
        });

        python.stderr.on('data', (data) => {
            console.error(`Python script error: ${data}`);
        });

        python.on('close', (code) => {
            if (code !== 0) {
                reject(`Python script failed with exit code ${code}`);
            } else {
                console.log('Old session files cleared and new files uploaded to Google Drive.');
                resolve();
            }
        });
    });
}

// Main connect function
async function connectToWhatsApp() {
    console.log("Connecting to WhatsApp...");

    try {
        // STEP 1: Ensure the session directory exists
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
            console.log('Session directory created.');
        }
    
        // STEP 2: Check if any local session exists
        let hasLocalSession = fs.readdirSync(sessionPath).length > 0;
    
        if (!hasLocalSession) {
            console.log('No local session found. Trying to download from Drive...');
            try {
                await downloadFromDrive();
                hasLocalSession = fs.readdirSync(sessionPath).length > 0;
    
                if (hasLocalSession) {
                    console.log('✅ Session successfully downloaded from Drive.');
                    sessionDownloaded = true;
                } else {
                    console.log('⚠️ No session files found on Drive.');
                    sessionDownloaded = false;
                }
    
            } catch (error) {
                console.error('Drive download failed:', error);
                sessionDownloaded = false;
            }
        } else {
            console.log('✅ Local session found.');
            sessionDownloaded = true;
        }
    
        // STEP 2: Connect with existing or new session
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: true, // Show QR only if no session found
        });

        sock.ev.on('creds.update', async () => {
            // Save the updated creds locally (this part will keep syncing)
            await saveCreds();

            // Now run your Python script to upload session to Drive immediately after creds update
            const { exec } = require('child_process');
            exec('python session-uploader.py', (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error uploading session: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                    return;
                }
                console.log(`Python script output: ${stdout}`);
            });
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            console.log(`Connection status: ${connection}`);

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log('Reconnecting to WhatsApp...');
                    scanQR = true;
                    await connectToWhatsApp();
                } else {
                    console.log('Session closed. Please scan QR code again.');
                    sock = null;
                }
            }

            if (connection === 'open') {
                console.log('✅ WhatsApp connected successfully!');

                // Upload session if it is new after QR scan
                if (scanQR) {
                    console.log('🆕 New session created after QR scan. Uploading to Drive...');
                    await clearAndUploadToDrive();
                    sessionDownloaded = true;
                } else {
                    console.log('🗂️ Using existing session. No need to upload to Drive.');
                }
            }
        });

    } catch (error) {
        console.error('Error during WhatsApp connection:', error);
    }

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
