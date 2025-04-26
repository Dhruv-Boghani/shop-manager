// sendBillToCustomer.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const Bill = require('../model/Bill');
const generateBillCanvas = require('./generateBillCanvas');
const { getClient } = require('./whatsappClient');

async function sendBillToCustomer(billId) {
    try {
        const sock = await getClient();
        if (!sock) {
            console.log('❗ WhatsApp client not ready.');
            return;
        }

        const bill = await Bill.findById(billId);
        if (!bill) {
            console.log('❌ Bill not found.');
            return;
        }

        const phoneNumber = `91${bill.customerPhone}`;
        const jid = `${phoneNumber}@s.whatsapp.net`;

        const pdfBuffer = await generateBillCanvas(billId);
        if (!pdfBuffer) {
            console.log('❌ Failed to generate PDF.');
            return;
        }

        const tempPath = path.join(os.tmpdir(), `bill-${bill.billNo || 'invoice'}.pdf`);
        fs.writeFileSync(tempPath, pdfBuffer);

        // First send text message
        await sock.sendMessage(jid, {
            text: `Hello ${bill.customerName},\n\n📄 Your bill (No: ${bill.billNo}) is ready.\nPlease find the PDF attached.`
        });

        // Then send PDF document
        await sock.sendMessage(jid, {
            document: fs.readFileSync(tempPath),
            mimetype: 'application/pdf',
            fileName: `bill-${bill.billNo || 'invoice'}.pdf`
        });

        fs.unlinkSync(tempPath); // Delete the temporary file
        console.log('✅ Bill sent successfully!');

    } catch (error) {
        console.error('❌ Error sending bill:', error);
    }
}

module.exports = { sendBillToCustomer };
