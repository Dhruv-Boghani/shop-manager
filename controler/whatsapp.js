const Bill = require("../model/Bill");
const generateBillCanvas = require("./generateBillCanvas");
const client = require('./whatsappClient'); // path to the client you just created
const { MessageMedia } = require('whatsapp-web.js');

async function sendMessage(billId) {
    const bill = await Bill.findById(billId); // You missed await here in your code
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
}

module.exports = sendMessage;
