const Bill = require("../model/Bill");
const generateBillCanvas = require("./generateBillCanvas");
const { getClient } = require('./whatsappClient'); // Exports getClient()
const { MessageMedia } = require('whatsapp-web.js');

async function sendMessage(billId) {
    try {
        const client = getClient();
        if (!client) {
            console.log('❗ WhatsApp client not ready.');
            return 0;
        }

        const bill = await Bill.findById(billId);
        if (!bill) {
            console.log('❌ Bill not found');
            return 0;
        }

        const pdfBuffer = await generateBillCanvas(billId);
        const base64PDF = pdfBuffer.toString('base64');
        const media = new MessageMedia('application/pdf', base64PDF, `bill-${bill.billNo || 'invoice'}.pdf`);

        const chatId = `91${bill.customerPhone}@c.us`;

        await client.sendMessage(chatId, '📄 Your bill is ready. Please find the PDF attached.');
        await client.sendMessage(chatId, media);

        console.log('✅ Message and PDF sent to WhatsApp');
        return 1;

    } catch (err) {
        console.error('❌ Error in sending WhatsApp message:', err);
        return 0;
    }
}

module.exports = sendMessage;
