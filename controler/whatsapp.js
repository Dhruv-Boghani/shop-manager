const Bill = require("../model/Bill");
const generateBillCanvas = require("./generateBillCanvas");
const { getClient } = require('./whatsappClient'); // Your whatsapp-web.js client

const fs = require("fs");
const path = require("path");
const os = require("os");

async function sendBillToCustomer(billId) {
    try {
        const client = getClient();
        if (!client) {
            console.log('❗ WhatsApp client not initialized.');
            return;
        }

        console.log('🔍 Fetching bill with ID:', billId);
        const bill = await Bill.findById(billId);
        if (!bill) {
            console.log('❌ Bill not found');
            return;
        }

        const phoneNumber = `91${bill.customerPhone}`;
        const chatId = `${phoneNumber}@c.us`;
        console.log('📱 Sending to:', chatId);

        const pdfBuffer = await generateBillCanvas(billId);
        if (!pdfBuffer) {
            console.log('❌ PDF generation failed.');
            return;
        }

        // Write PDF buffer to a temporary file
        const tempFilePath = path.join(os.tmpdir(), `bill-${bill.billNo || 'invoice'}.pdf`);
        fs.writeFileSync(tempFilePath, pdfBuffer);

        // Send a text message
        console.log('🧾 Sending message...');
        await client.sendMessage(chatId, `Hello ${bill.customerName},\n\n📄 Your bill (No: ${bill.billNo}) is ready.\nPlease find the PDF attached.`);

        // Send the PDF as a document
        console.log('📎 Sending PDF...');
        const media = MessageMedia.fromFilePath(tempFilePath);
        await client.sendMessage(chatId, media, { caption: '🧾 Please check your bill PDF' });

        // Clean up the temp file
        fs.unlinkSync(tempFilePath);

        console.log('✅ Bill sent to WhatsApp successfully.');
    } catch (error) {
        console.error('❌ Error sending bill:', error);
    }
}

module.exports = { sendBillToCustomer };
