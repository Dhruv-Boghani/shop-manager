const { createCanvas } = require("canvas");
const { PDFDocument } = require("pdf-lib");
const Bill = require("../model/Bill");
const Shop = require("../model/Shop");
const Product = require("../model/Product");

const WIDTH = 600;
const MAX_HEIGHT = 800;
const MARGIN = 40;
const LINE_HEIGHT = 25;

async function generateBillCanvas(billId) {
  const bill = await Bill.findById(billId);
  if (!bill) throw new Error("Bill not found");

  const shop = await Shop.findById(bill.shopId);
  if (!shop) throw new Error("Shop not found");

  const itemsPerPage = Math.floor((MAX_HEIGHT - 250) / LINE_HEIGHT); // 250 for header + totals
  const pages = [];

  const totalItems = bill.products.length;
  const chunks = [];

  for (let i = 0; i < totalItems; i += itemsPerPage) {
    chunks.push(bill.products.slice(i, i + itemsPerPage));
  }

  for (const chunk of chunks) {
    const canvas = createCanvas(WIDTH, MAX_HEIGHT, 'pdf');
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = "#000";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(shop.name.toUpperCase(), WIDTH / 2, 50);

    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    let y = 90;

    ctx.fillText(`Bill No: ${bill.billNo}`, MARGIN, y);
    ctx.fillText(
      `Date: ${new Date(bill.createdAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })}`, 320, y);
    y += 30;

    ctx.fillText(`Customer: ${bill.customerName}`, MARGIN, y);
    ctx.fillText(`Phone: ${bill.customerPhone}`, 320, y);
    y += 40;

    // Table Header
    ctx.font = "bold 14px Arial";
    ctx.fillText("Item", MARGIN, y);
    ctx.fillText("Qty", 250, y);
    ctx.fillText("Rate", 320, y);
    ctx.fillText("Amt", 400, y);
    y += LINE_HEIGHT;

    ctx.font = "14px Arial";
    for (const p of chunk) {
      const product = await Product.findById(p.productId);
      const name = product?.name || "Item";
      const qty = p.quantity || 1;
      const rate = p.rate || 0;
      const amt = qty * rate;

      ctx.fillText(name, MARGIN, y);
      ctx.fillText(qty.toString(), 250, y);
      ctx.fillText(rate.toString(), 320, y);
      ctx.fillText(amt.toString(), 400, y);
      y += LINE_HEIGHT;
    }

    // Only add total in last page
    if (chunk === chunks[chunks.length - 1]) {
      y += 20;
      ctx.font = "bold 16px Arial";
      ctx.fillText(`Total Amount: Rs. ${bill.totalAmount}`, MARGIN, y);
      y += LINE_HEIGHT;
      ctx.fillText(`Received: Rs. ${bill.totalReceiveAmount}`, MARGIN, y);
      y += LINE_HEIGHT;
      ctx.fillText(`Discount: Rs. ${bill.totalAmount - bill.totalReceiveAmount}`, MARGIN, y);
    }

    pages.push(canvas.toBuffer('application/pdf'));
  }

  // Merge all pages using pdf-lib
  const mergedPdf = await PDFDocument.create();

  for (const pageBuffer of pages) {
    const pageDoc = await PDFDocument.load(pageBuffer);
    const copiedPages = await mergedPdf.copyPages(pageDoc, pageDoc.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  const finalPdfBuffer = await mergedPdf.save();
  return finalPdfBuffer;
}

module.exports = generateBillCanvas;
