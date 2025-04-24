const Bill = require("../model/Bill");
const generateBillCanvas = require("./generateBillCanvas");
const { getClient } = require('./whatsappClient'); // Your custom Baileys client getter

async function sendMessage(billId) {
    try {
        const sock = getClient(); // Baileys client
        if (!sock) {
            console.log('❗ WhatsApp client not ready.');
            return 0;
        }

        console.log('🔍 Fetching bill with ID:', billId);
        const bill = await Bill.findById(billId);
        if (!bill) {
            console.log('❌ Bill not found');
            return 0;
        }

        const chatId = `91${bill.customerPhone}@s.whatsapp.net`; // Baileys format
        console.log('📱 Sending to:', chatId);

        const pdfBuffer = await generateBillCanvas(billId);
        if (!pdfBuffer) {
            console.log('❌ PDF generation failed.');
            return 0;
        }

        console.log('🧾 Sending bill text...');
        await sock.sendMessage(chatId, { text: '📄 Your bill is ready. Please find the PDF attached.' });

        console.log('📎 Uploading PDF...');
        await sock.sendMessage(chatId, {
            document: pdfBuffer,
            mimetype: 'application/pdf',
            fileName: `bill-${bill.billNo || 'invoice'}.pdf`
        });

        console.log('✅ Message and PDF sent to WhatsApp');
        return 1;

    } catch (err) {
        console.error('❌ Error in sending WhatsApp message:', err);
        return 0;
    }
}

module.exports = sendMessage;
